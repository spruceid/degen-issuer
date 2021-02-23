<script>
    import Navaid from "navaid";
    import { onDestroy } from "svelte";
    import Ethcontrol from "../routes/Ethcontrol.svelte";
    import Solcontrol from "../routes/Solcontrol.svelte";
    import Unicred from "../routes/Unicred.svelte";
    import Srmcred from "../routes/Srmcred.svelte";
    import Home from "../routes/Home.svelte";

    let Route,
        params = {},
        active;
    let uri = location.pathname;
    $: active = uri.split("/");

    const router = Navaid("/")
        .on("/", () => (Route = Home))
        .on("/Ethcontrol", () => (Route = Ethcontrol))
        .on("/Solcontrol", () => (Route = Solcontrol))
        .on("/Unicred", () => (Route = Unicred))
        .on("/Srmcred", () => (Route = Srmcred))
        .listen();

    onDestroy(router.unlisten);
</script>

<svelte:head>
    <link
        href="https://fonts.googleapis.com/css2?family=Poppins&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<main
    class="flex h-full w-full justify-center"
    style="background: linear-gradient(158.67deg, #020736 30.84%, #300E92 103.49%)"
>
    <svelte:component this={Route} {params} />
    <img
        src="/effect.svg"
        alt="background effect"
        class="absolute bottom-0 left-0 z-0"
    />
</main>

<style global lang="postcss">
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
</style>
