<script>
    export let label;
    export let icon;
</script>

<button class="bg-blue-990 text-white py-4 text-left rounded-2xl font-semibold flex items-center h-18 w-full">
    {#if icon}
        <div class="w-24 flex justify-center"><img alt="{label}-logo" src={icon} /></div>
        { label }
    {:else}
        <p class="justify-center flex w-full">{ label }</p>
    {/if}
</button>