<script>
	import BaseLayout from "../components/BaseLayout.svelte";
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

<style>
	.content {
		max-width: 72ex;
		color: #eee;
		margin: 0 auto;
	}
	.error {
		color: red;
	}
	a {
		text-decoration: underline;
	}
	p {
		margin: 1em 0;
	}
</style>

<BaseLayout title="Connect Credential Wallet" allowUnauthed=true>
	{#if errorMessage}
		<div class="content">
			<p class="error">{errorMessage}</p>
		</div>
	{/if}
	{#if statusMessage}
		<p class="content">{statusMessage}</p>
	{:else}
		<SecondaryButton label="Connect Wallet" onClick={connectWallet} />
	{/if}
	<p class="content"><a href="/">Back</a>
</BaseLayout>
