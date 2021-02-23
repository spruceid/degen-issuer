<script>
  export let title;
  export let icon;
</script>

<div class="flex flex-col items-center justify-center">
  <img src={icon} alt="{title}-icon" class="w-16 h-16" />
  <h1
    class="md:mt-12 md:mb-16 mb-4 font-semibold text-6xl text-white text-center"
  >
    {title}
  </h1>
</div>
