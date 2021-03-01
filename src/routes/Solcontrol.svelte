<script>
	import BaseLayout from "../components/BaseLayout.svelte";
	import loadDIDKit from "../DIDKit.js";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import { Buffer } from "buffer";
	import {
		Connection,
		clusterApiUrl,
		PublicKey,
		Transaction,
		TransactionInstruction,
	} from "@solana/web3.js";
	import Wallet from "@project-serum/sol-wallet-adapter";
	import { solanaWallet, solanaLiveAddress } from "../store.js";
	import { v4 as uuid } from "uuid";

	// TODO: Replace with Tezos? Add Solana Method?
	import getEthereum from "../ethereum.js";

	$: wallets = false;
	$: ethAddress = "";
	$: errorMessage = "";

	// TODO: Update Devnet ?
	let connection = new Connection(clusterApiUrl("devnet"));
	const providerUrl = "https://www.sollet.io";

	let wallet = false;
	solanaWallet.subscribe((w) => {
		wallet = w;
	});

	$: verifiableCredential = false;
	$: credentialUrl = createJsonBlobUrl(verifiableCredential);

	const createJsonBlobUrl = (object) => {
		const blob = new Blob([JSON.stringify(object, null, 2)]);
		return URL.createObjectURL(blob, { type: "application/json" });
	};

	const makeCredential = (did, solAddr, signature) => {
		return {
			"@context": [
				"https://www.w3.org/2018/credentials/v1",
				{
					sameAs: "https://www.w3.org/TR/owl-ref/#sameAs-def",
				},
			],
			id: "urn:uuid:" + uuid(),
			issuer: did,
			issuanceDate: new Date().toISOString(),
			type: ["VerifiableCredential"],
			credentialSubject: {
				id: did,
				// TODO: clearer fmt
				sameAs: `${solAddr}:${signature}`,
			},
		};
	};

	const signIn = async () => {
		let w = new Wallet(providerUrl);
		solanaWallet.set(w);

		wallet.on("connect", async (pubKey) => {
			solanaLiveAddress.set(pubKey);
			try {
				const ethereum = await getEthereum();
				wallets = await ethereum.request({ method: "eth_requestAccounts" });
			} catch (err) {
				console.error(err);
			}
		});

		wallet.on("disconnect", () => {
			solanaWallet.set(false);
			solanaLiveAddress.set("");
		});

		await wallet.connect();
	};

	const signOut = async () => {
		await wallet.disconnect();
	};

	const createCredential = async () => {
		if (!ethAddress || !wallet) {
			return;
		}
		try {
			let transactionInstruction = new TransactionInstruction();
			transactionInstruction.keys = [
				{
					pubkey: new PublicKey($solanaLiveAddress.toString()),
					isSigner: true,
					isWritable: true,
				},
			];

			// TODO: Check if this needs to be async.
			const currentAddress = await $solanaLiveAddress.toString();
			// TODO: Change this? May appear in sollet pop-up -- could it be plain text?
			// transactionInstruction.programId = currentAddress;
			transactionInstruction.programId = currentAddress;

			// const did = "did:tz:"; // TODO
			// TODO: Generalize to signed in wallet if not using did tezos.
			const did = "did:ethr:" + ethAddress;

			transactionInstruction.data = new Buffer(currentAddress);
			let transaction = new Transaction();

			await transaction.add(transactionInstruction);

			let { blockhash } = await connection.getRecentBlockhash();
			transaction.recentBlockhash = blockhash;
			transaction.feePayer = new PublicKey(currentAddress);

			let res = await wallet.signTransaction(transaction);
			if (
				!res.signatures ||
				!res.signatures.length > 0 ||
				!res.signatures[0].signature
			) {
				throw Error("No signatures on transaction found");
			}

			const DIDKit = await loadDIDKit();
			let sigBytes = res.signatures[0].signature;
			let signature = Buffer.from(sigBytes).toString("hex");

			// TODO: Add requirement for Ethereum Wallet, then create proof
			let cred = makeCredential(did, currentAddress, signature);


			const proofOptions = {
				verificationMethod: did + "#Eip712Method2021",
			};
			const keyType = { kty: "EC", crv: "secp256k1", alg: "ES256K-R" };

			let credString = JSON.stringify(cred);
			let prepString = await DIDKit.prepareIssueCredential(
				credString,
				JSON.stringify(proofOptions),
				JSON.stringify(keyType)
			);

			let preparation = JSON.parse(prepString);

			const typedData = preparation.signingInput;
			if (!typedData || !typedData.primaryType) {
				console.error("proof preparation:", preparation);
				throw new Error("Expected EIP-712 TypedData");
			}

			const ethereum = await getEthereum();

			const ethSignature = await ethereum.request({
				method: "eth_signTypedData_v4",
				params: [ethAddress, JSON.stringify(typedData)],
			});

			let vcString = await DIDKit.completeIssueCredential(
				credString,
				JSON.stringify(preparation),
				ethSignature
			);

			verifiableCredential = JSON.parse(vcString);
		} catch (err) {
			// TODO: Bubble err.
			console.error(err);
		}
	};

	async function storeCredential(e) {
		e.preventDefault();
		errorMessage = "";
		statusMessage = "Storing credential…";
		try {
			// Wrap VC in a unsigned VP for CHAPI
			const vp = {
				"@context": ["https://www.w3.org/2018/credentials/v1"],
				type: "VerifiablePresentation",
				verifiableCredential,
			};
			const webCredential = new WebCredential("VerifiablePresentation", vp);
			const storeResult = await navigator.credentials.store(webCredential);
			if (!storeResult) throw new Error("Unable to store credential");
			statusMessage = JSON.stringify(storeResult);
		} catch (err) {
			statusMessage = "";
			console.error(err);
			errorMessage = err.message;
		}
	}
</script>

<BaseLayout title="Solana Address Controller" icon="/solana.svg">
	{#if errorMessage}
		<div class="error-container">
			<p>{errorMessage}</p>
		</div>
	{/if}
	{#if !$solanaLiveAddress}
		<SecondaryButton label="Connect Wallet" onClick={signIn} />
	{:else}
		<SecondaryButton label="Disconnect" onClick={signOut} />
		{#if !verifiableCredential && wallets}
			<label for="currentAddress">Choose Eth Address to create DID</label>
			<select
				class="text-white p-4 text-left rounded-2xl max-w-sm mx-auto flex items-center h-16 w-full bg-blue-998 border-2 border-blue-997 mb-6"
				bind:value={ethAddress}
				name="ethAddress"
			>
				<option value="">No Address Selected</option>
				{#each wallets as wallet}
					<option value={wallet}>{wallet}</option>
				{/each}
			</select>

			{#if ethAddress}
				<SecondaryButton
					label="Get Verifiable Credential for Solana"
					onClick={createCredential}
				/>
			{/if}
		{/if}
		{#if verifiableCredential}
			<div class="main">
				<p>Your credential is ready.</p>
				<div>
					<a href="" on:click={storeCredential}
						>Store credential in CHAPI wallet</a
					>
				</div>
				{#if credentialUrl}
					<div>or</div>
					<div><a href={credentialUrl}>Download credential</a></div>
				{/if}
			</div>
		{/if}
	{/if}
</BaseLayout>

<style>
	.main {
		max-width: 72ex;
		color: #eee;
		margin: 0 auto;
	}
	.error-container {
		color: red;
	}
	a {
		text-decoration: underline;
	}
	p {
		margin: 1em 0;
	}
</style>
