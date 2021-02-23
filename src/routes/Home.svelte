<script>
  import RouteLayout from "../components/RouteLayout.svelte";
  import Button from "./../components/Button.svelte";
</script>

<RouteLayout>
  <img src="/header_effect.svg" alt="header background effect" class="h-52" />
  <div class="flex flex-col justify-start flex-grow mx-4">
    <h1
      class="md:mt-8 md:mb-12 mb-4 font-semibold text-6xl text-white text-center"
    >
      Degen Passport
    </h1>
    <Button
      href="/Ethcontrol"
      label="Ethereum Address Controller"
      icon="/ethereum.svg"
    />
    <Button
      href="/Solcontrol"
      label="Solana Address Controller"
      icon="/solana.svg"
    />
    <Button href="/Unicred" label="Uniswap Credentials" icon="/uniswap.svg" />
    <Button href="/Srmcred" label="Serum Credentials" icon="/serum.svg" />
  </div>
</RouteLayout>
