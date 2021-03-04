<script>
	import { polyfill } from './../CredentialWallet.js';
	import BaseLayout from "../components/BaseLayout.svelte";
	import loadDIDKit from "../DIDKit.js";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import { Buffer } from "buffer";
	import {
		PublicKey,
		Transaction,
		TransactionInstruction,
	} from "@solana/web3.js";
	import Wallet from "@project-serum/sol-wallet-adapter";
	import { solanaWallet, solanaLiveAddress } from "../store.js";
	import { v4 as uuid } from "uuid";
	import { id } from "../CredentialWallet.js";
	import base64url from "base64url";
	import Button from "../components/Button.svelte";

	const ZERO32_B58 = "11111111111111111111111111111111";

	$: errorMessage = "";
	$: statusMessage = "";

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

	const makeCredential = (issuer, subject) => {
		return {
			"@context": [
				"https://www.w3.org/2018/credentials/v1",
				{
					sameAs: "https://www.w3.org/TR/owl-ref/#sameAs-def",
				},
			],
			id: "urn:uuid:" + uuid(),
			issuer,
			issuanceDate: new Date().toISOString(),
			type: ["VerifiableCredential"],
			credentialSubject: {
				id: subject,
				sameAs: issuer,
			},
		};
	};

	const signIn = async () => {
		statusMessage = "Connecting to wallet…";
		let w = new Wallet(providerUrl);
		solanaWallet.set(w);

		wallet.on("connect", async (pubKey) => {
			statusMessage = "";
			solanaLiveAddress.set(pubKey);
		});

		wallet.on("disconnect", () => {
			statusMessage = "";
			solanaWallet.set(false);
			solanaLiveAddress.set("");
		});

		await wallet.connect();
	};

	const signOut = async () => {
		await wallet.disconnect();
	};

	const createCredentialInner = async () => {
		const DIDKit = await loadDIDKit();
		const currentAddress = $solanaLiveAddress.toString();
		const did = "did:sol:" + currentAddress;

		const proofOptions = {
			verificationMethod: did + "#SolanaMethod2021",
			proofPurpose: "assertionMethod",
		};
		const keyType = { kty: "OKP", alg: "EdDSA", crv: "ed25519", x: "" };
		let cred = makeCredential(did, $id);
		console.log("unsigned credential", cred);
		let credString = JSON.stringify(cred);
		let prepString = await DIDKit.prepareIssueCredential(
			credString,
			JSON.stringify(proofOptions),
			JSON.stringify(keyType)
		);
		let preparation = JSON.parse(prepString);
		console.log("pre", preparation);
		const signingInput = preparation.signingInput;

		let transaction = new Transaction({
			recentBlockhash: ZERO32_B58,
			feePayer: new PublicKey(currentAddress),
		});
		let transactionInstruction = new TransactionInstruction({
			programId: currentAddress,
			data: signingInput,
		});
		transaction.add(transactionInstruction);

		statusMessage = "Waiting for wallet…";
		let res = await wallet.signTransaction(transaction);
		if (
			!res.signatures ||
			!res.signatures.length > 0 ||
			!res.signatures[0].signature
		) {
			throw Error("No signatures on transaction found");
		}
		let sigBytes = res.signatures[0].signature;
		let signature = base64url.encode(Buffer.from(sigBytes));

		let vcString = await DIDKit.completeIssueCredential(
			credString,
			prepString,
			signature
		);

		verifiableCredential = JSON.parse(vcString);
	};

	const createCredential = async () => {
		if (!wallet) {
			return;
		}
		statusMessage = "Preparing credential…";
		try {
			await createCredentialInner();
		} catch (err) {
			console.error(err);
			errorMessage = err.message;
		}
		statusMessage = "";
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
			// const webCredential = new WebCredential("VerifiablePresentation", vp);
			const storeResult = await polyfill.store(vp);
			if (!storeResult) throw new Error("Unable to store credential");
			statusMessage = JSON.stringify(storeResult);
		} catch (err) {
			statusMessage = "";
			console.error(err);
			errorMessage = err.message;
			verifiableCredential = null;
		}
	}
</script>

<BaseLayout title="Solana Address Controller" icon="/solana.svg">
	<div class="main">
		{#if errorMessage}
			<div class="error-container">
				<p>{errorMessage}</p>
			</div>
		{/if}
		{#if statusMessage}
			<p>{statusMessage}</p>
		{/if}
	</div>
	{#if !$solanaLiveAddress}
		<SecondaryButton label="Connect Wallet" onClick={signIn} />
	{:else}
		<SecondaryButton label="Disconnect" onClick={signOut} />
		{#if !verifiableCredential}
			<SecondaryButton
				label="Get Verifiable Credential for Solana"
				onClick={createCredential}
			/>
		{/if}
		{#if verifiableCredential}
			<div class="main">
				<p>Your credential is ready.</p>
				<Button href="" onClick={storeCredential} label="Store Credential in Degen-Passport"></Button>
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
