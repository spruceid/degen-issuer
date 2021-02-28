<script>
	import BaseLayout from "../components/BaseLayout.svelte";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import { Buffer } from "buffer";
	import {
		Connection,
		clusterApiUrl,
		PublicKey,
		Transaction,
		TransactionInstruction,
		// TransactionInstructionCtorFields,
	} from "@solana/web3.js";
	import Wallet from "@project-serum/sol-wallet-adapter";
	import { solanaWallet, solanaLiveAddress } from "../store.js";
	import { v4 as uuid } from "uuid";

	// TODO: Update Devnet ?
	let connection = new Connection(clusterApiUrl("devnet"));
	const providerUrl = "https://www.sollet.io";

	let wallet = false;
	solanaWallet.subscribe((w) => {
		wallet = w;
	});

	const makeCredential = (did, subject) => {
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
				id: subject,
				sameAs: did,
			},
		};
	};

	const signIn = async () => {
		let w = new Wallet(providerUrl);
		solanaWallet.set(w);

		wallet.on("connect", async (pubKey) => {
			solanaLiveAddress.set(pubKey);

			try {
				let transactionInstruction = new TransactionInstruction();
				transactionInstruction.keys = [
					{
						pubkey: new PublicKey($solanaLiveAddress.toString()),
						isSigner: true,
						isWritable: true,
					},
				];
				// TODO: Change this? May appear in sollet pop-up -- could it be plain text?
				transactionInstruction.programId = await $solanaLiveAddress.toString();
				const subject = "did:tz:"; // TODO
				const did = "did:ethr:" + (await $solanaLiveAddress.toString());
				let cred = JSON.stringify(makeCredential(did, subject));
				transactionInstruction.data = new Buffer(cred);
				let transaction = new Transaction();

				await transaction.add(transactionInstruction);

				let { blockhash } = await connection.getRecentBlockhash();
				transaction.recentBlockhash = blockhash;
				transaction.feePayer = new PublicKey($solanaLiveAddress.toString());

				let res = await wallet.signTransaction(transaction);

			} catch (err) {
				// TODO: Bubble err.
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
</script>

<BaseLayout title="Solana Address Controller" icon="/solana.svg">
	{#if !$solanaLiveAddress}
		<SecondaryButton label="Connect Wallet" onClick={signIn} />
	{:else}
		<SecondaryButton label="Disconnect" onClick={signOut} />
	{/if}
</BaseLayout>
