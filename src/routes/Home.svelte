<script>
	import RouteLayout from "../components/RouteLayout.svelte";
	import Button from "./../components/Button.svelte";
	import { id } from "../CredentialWallet.js";

	let currentID = false;
	id.subscribe((i) => {
		currentID = i;
	});

	$: userSuppliedID = "";
</script>

<div class="absolute top-4 left-4 z-20">
	{#if !userSuppliedID}
	<Button href="/Credwallet" label="Connect Credential Wallet" />
	{:else}
		<Button
			label="Set Custom ID"
			onClick={() => {
				id.set(userSuppliedID);
			}}
		/>
	{/if}
	<input
		name="customID"
		bind:value={userSuppliedID}
		placeholder="Custom ID"
		class="text-white mt-4 p-4 text-left rounded-2xl max-w-sm mx-auto flex items-center h-16 w-full bg-blue-998 border-2 border-blue-997"
	/>
</div>

<RouteLayout>
	<img src="/header_effect.svg" alt="header background effect" class="h-52" />
	<div class="flex flex-col justify-start flex-grow mx-4">
		<h1
			class="md:mt-8 md:mb-12 mb-4 font-semibold text-6xl text-white text-center"
		>
			Degen Passport
		</h1>
		<Button
			href="/Ethcontrol"
			label="Ethereum Address Controller"
			icon="/ethereum.svg"
			disabled={!currentID}
		/>
		<Button
			href="/Solcontrol"
			label="Solana Address Controller"
			icon="/solana.svg"
			disabled={!currentID}
		/>
		<Button
			href="/Unicred"
			label="Uniswap Credentials"
			icon="/uniswap.svg"
			disabled={!currentID}
		/>
		<Button
			href="/Srmcred"
			label="Serum Credentials"
			icon="/serum.svg"
			disabled={!currentID} 
		/>
	</div>
</RouteLayout>
