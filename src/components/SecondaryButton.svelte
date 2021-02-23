<script>
    export let label;
    export let icon;
</script>

<button
    class="text-white py-4 text-left rounded-2xl max-w-sm mx-auto font-semibold flex items-center h-16 w-full"
    style="background: linear-gradient(270deg, #8743FF 0%, #4136F1 100%); box-shadow: 0px 15px 30px 0px rgba(20, 102, 204, 0.40);"
>
    {#if icon}
        <div class="w-24 flex justify-center"><img alt="{label}-logo" src={icon} /></div>
        { label }
    {:else}
        <p class="justify-center flex w-full">{ label }</p>
    {/if}
</button>