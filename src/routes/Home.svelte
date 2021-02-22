<script>
	import Button from "./../components/Button.svelte";
</script>

<main class="z-10 flex flex-col flex-grow items-center justify-center">
	<img src="/header_effect.svg" alt="header background effect" class="h-52" />
	<div class="flex flex-col justify-start flex-grow">
		<h1 class="z-10 md:mt-12 md:mb-16 mb-4 font-semibold text-6xl text-white text-center">
			Degen Passport
		</h1>
		<a href="/Ethcontrol" class="my-2">
			<Button label="Ethereum Address Controller" icon="/ethereum.png" />
		</a>
		<a href="/Solcontrol" class="my-2">
			<Button label="Solana Address Controller" icon="/solana.png" />
		</a>
		<a href="/Unicred" class="my-2">
			<Button label="Uniswap Credentials" icon="/uniswap.png" />
		</a>
		<a href="/Srmcred" class="my-2">
			<Button label="Serum Credentials" icon="/serum.png" />
		</a>
	</div>
</main>
