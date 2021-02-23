<script>
	import SecondaryButton from './SecondaryButton.svelte';
	import IconTitle from './IconTitle.svelte';
import Menu from './Menu.svelte';
    export let title;
    export let icon;
</script>

<div class="flex flex-col flex-grow z-10">
    <Menu></Menu>
    <IconTitle {title} {icon} />
    <SecondaryButton label="Connect Wallet" />
</div>
