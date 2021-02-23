<script>
	// import { onMount } from "svelte";

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
	<button on:click={issueFunc}>Issue {credentialTitle} Credential</button>
{:else if !statusEntry.live && statusEntry.status[credentialKey].qualified}
	<button disabled={true}>Create {credentialTitle} Credential</button>
	<p style="color:white">
		Cannot create new credential with disconnected wallet
	</p>
	<!-- TODO: Add qualifications check here -->
{:else if statusEntry.status[credentialKey].qualified}
	<button on:click={createFunc}>Create {credentialTitle} Credential</button>
{:else if statusEntry.status[credentialKey].qualified_err}
	<p style="color:white;">
		Does not qualify for {credentialTitle} Credential: {statusEntry.status[
			credentialKey
		].qualified_err}
	</p>
{/if}
