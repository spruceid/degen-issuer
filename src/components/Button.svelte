<script>
  export let label = "";
  export let icon = "";
  export let href = "/";
  export let onclick = () => {};
</script>

<a {href} class="max-w-sm mx-auto my-2 w-full" on:click={onclick}>
  <button
    class="bg-blue-990 text-white py-4 text-left rounded-2xl font-semibold flex items-center w-full h-18"
  >
    {#if icon}
      <div class="w-24 flex justify-center">
        <img alt="{label}-logo" src={icon} />
      </div>
      {label}
    {:else}
      <p class="justify-center flex w-full">{label}</p>
    {/if}
  </button>
</a>
