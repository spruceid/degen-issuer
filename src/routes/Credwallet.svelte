<script>
	import BaseLayout from "../components/BaseLayout.svelte";
import RouteLayout from "../components/RouteLayout.svelte";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import * as CredentialWallet from "../CredentialWallet.js";

	let errorMessage;
	let statusMessage;

	async function connectWallet() {
		statusMessage = "Waiting for Credential Wallet...";
		try {
			await CredentialWallet.connect();
			statusMessage = "Connected.";
		} catch(err) {
			statusMessage = "";
			console.error(err);
			errorMessage = err.message;
		}
	}
</script>

<RouteLayout title="Connect Credential Wallet" allowUnauthed={true}>
	{#if errorMessage}
		<p class="text-red-700">{errorMessage}</p>
	{/if}
	{#if statusMessage}
		<p class="text-white">{statusMessage}</p>
	{:else}
		<SecondaryButton label="Connect Wallet" onClick={connectWallet} />
	{/if}
	<p class="text-white"><a href="/">Back</a>
</RouteLayout>
