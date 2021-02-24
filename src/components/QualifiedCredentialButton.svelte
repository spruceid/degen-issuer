<script>
	// import { onMount } from "svelte";
	import SecondaryButton from "./SecondaryButton.svelte";

	// The key that the credential's base is stored at in the statusEntry
	export let credentialKey;
	// The title of the credential to be used in the UI
	export let credentialTitle;
	// An object contiaining the qualification status of the the given wallet
	export let statusEntry;

	// the function to call when caching a credential for future use
	export let createFunc;
	// the function to call when issuing a cached credential
	export let issueFunc;
</script>

{#if statusEntry.status[credentialKey].cached}
	<SecondaryButton
		onClick={issueFunc}
		label={`Issue ${credentialTitle} Credential`}
	/>
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
