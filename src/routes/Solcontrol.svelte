<script>
	import BaseLayout from "../components/BaseLayout.svelte";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import { Connection, clusterApiUrl } from "@solana/web3.js";
	import Wallet from "@project-serum/sol-wallet-adapter";
	import { solanaWallet, solanaLiveAddress } from "../store.js";

	// TODO: Update Devnet
	let connection = new Connection(clusterApiUrl("devnet"));
	const providerUrl = "https://www.sollet.io";

	let wallet = false;
	solanaWallet.subscribe((w) => {
		wallet = w;
	});

	const signIn = async () => {
		let w = new Wallet(providerUrl);
		solanaWallet.set(w);

		wallet.on("connect", (pubKey) => {
			solanaLiveAddress.set(pubKey);
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
