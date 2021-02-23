<script>
	import { onMount } from "svelte";

	export let credentialKey;
	export let credentialTitle;
	export let statusEntry;

	export let issueFunc;
	export let createFunc;
	onMount(() => {
		console.log(credentialKey);
		console.log(credentialTitle);
		console.log(statusEntry);
	});
</script>

<div>
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
			Does not qualify for {credentialTitle} Credential: {statusEntry.status[credentialKey]
				.qualified_err}
		</p>
	{/if}
</div>
