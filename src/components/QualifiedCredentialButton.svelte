<script>
	import { polyfill } from './../CredentialWallet.js';
	import Button from './Button.svelte';
	// import { onMount } from "svelte";
	import SecondaryButton from "./SecondaryButton.svelte";

	// The key that the credential's base is stored at in the statusEntry
	export let credentialKey;
	// The title of the credential to be used in the UI
	export let credentialTitle;
	// An object contiaining the qualification status of the the given wallet
	export let statusEntry;

	// An object containing cached credentials available using the credentialKey
	// if the credential exists that is
	export let cachedWalletCategory;

	// the function to call when caching a credential for future use
	export let createFunc;

	$: errorMessage = "";
	// TODO: Make this not a terrible nested ternary.
	$: credentialUrl = cachedWalletCategory
		? cachedWalletCategory[credentialKey]
			? createJsonBlobUrl(cachedWalletCategory[credentialKey])
			: false
		: false;

	// TODO: Import rather than C+P
	const createJsonBlobUrl = (object) => {
		const blob = new Blob([JSON.stringify(object, null, 2)]);
		return URL.createObjectURL(blob, { type: "application/json" });
	};

	// TODO: Import from one area rather than C+P here/solana/eth control
	async function storeCredential(e) {
		e.preventDefault();
		errorMessage = "";
		statusMessage = "Storing credential…";
		try {
			// Wrap VC in a unsigned VP for CHAPI
			const vp = {
				"@context": ["https://www.w3.org/2018/credentials/v1"],
				type: "VerifiablePresentation",
				verifiableCredential: cachedWalletCategory[credentialKey],
			};
			// const webCredential = new WebCredential("VerifiablePresentation", vp);
			const storeResult = await polyfill.store(vp);
			if (!storeResult) throw new Error("Unable to store credential");
			statusMessage = JSON.stringify(storeResult);
		} catch (err) {
			statusMessage = "";
			console.error(err);
			errorMessage = err.message;
		}
	}
</script>

{#if errorMessage}
	<div class="error-container">
		<p>{errorMessage}</p>
	</div>
{/if}

{#if cachedWalletCategory && cachedWalletCategory[credentialKey]}
	<div class="main">
		<p>{credentialTitle} Credential is ready.</p>
		<Button href="" onClick={storeCredential} label="Store Credential in Degen-Passport"></Button>
		{#if credentialUrl}
			<div>or</div>
			<div><a href={credentialUrl}>Download credential</a></div>
		{/if}
	</div>
{:else if !statusEntry.live && statusEntry.status[credentialKey].qualified}
	<SecondaryButton
		disabled={true}
		label={`Connect to create ${credentialTitle} Credential`}
	/>
{:else if statusEntry.status[credentialKey].qualified}
	<SecondaryButton
		onClick={createFunc}
		label={`Create ${credentialTitle} Credential`}
	/>
{:else if statusEntry.status[credentialKey].qualified_err}
	<SecondaryButton
		disabled={true}
		label={`Does not qualify for ${credentialTitle} Credential`}
	/>
{/if}

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
