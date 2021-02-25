<script>
    import IconTitle from "./IconTitle.svelte";
    import Menu from "./Menu.svelte";
    export let title;
    export let icon;
    export let allowUnauthed = false;
    import {id} from "../CredentialWallet.js";
</script>

<style>
.content {
    max-width: 72ex;
    color: #eee;
    margin: 0 auto;
}
a {
    text-decoration: underline;
}
p {
    margin: 1em 0;
}
</style>

<div class="flex flex-col flex-grow z-10">
    <Menu />
    <IconTitle {title} {icon} />
    {#if $id || allowUnauthed}
        <slot />
    {:else}
        <div class="content">
            <p>Please connect your credential wallet first.</p>
            <p><a href="/">Back</a></p>
        </div>
    {/if}
</div>
