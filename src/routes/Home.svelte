<script>
	import Button from "./../components/Button.svelte";
</script>

<main class="z-10 flex flex-col flex-grow items-center justify-center">
	<img src="/header_effect.svg" alt="header background effect" class="h-52" />
	<div class="flex flex-col justify-start flex-grow mx-4">
		<h1 class="md:mt-8 md:mb-12 mb-4 font-semibold text-6xl text-white text-center">
			Degen Passport
		</h1>
		<a href="/Ethcontrol" class="my-2">
			<Button label="Ethereum Address Controller" icon="/ethereum.svg" />
		</a>
		<a href="/Solcontrol" class="my-2">
			<Button label="Solana Address Controller" icon="/solana.svg" />
		</a>
		<a href="/Unicred" class="my-2">
			<Button label="Uniswap Credentials" icon="/uniswap.svg" />
		</a>
		<a href="/Srmcred" class="my-2">
			<Button label="Serum Credentials" icon="/serum.svg" />
		</a>
	</div>
</main>
