<script>
	import BaseLayout from "../components/BaseLayout.svelte";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import { Connection, clusterApiUrl } from "@solana/web3.js";
	import Wallet from "@project-serum/sol-wallet-adapter";

	// TODO: Update Devnet
	let connection = new Connection(clusterApiUrl("devnet"));
	const providerUrl = "https://www.sollet.io";

	$: currentAddress = "";
	$: wallet = false;

	const signIn = async () => {
		let wallet = new Wallet(providerUrl);
		wallet.on("connect", (pubKey) => {
			currentAddress = pubKey;
		});

		wallet.on("disconnect", () => {
			currentAddress = "";
			wallet = false;
		});

		await wallet.connect();
	};

	const signOut = async () => {
		await wallet.disconnect();
	};
</script>

<BaseLayout title="Solana Address Controller" icon="/solana.svg">
	{#if !currentAddress}
		<SecondaryButton label="Connect Wallet" onClick={signIn}/>
	{:else}
		<SecondaryButton label="Disconnect" onClick={signOut} />
	{/if}
</BaseLayout>
