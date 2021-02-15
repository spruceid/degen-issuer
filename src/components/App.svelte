<script>
	import Navaid from 'navaid';
	import { onDestroy } from 'svelte';
	import Ethcontrol from '../routes/Ethcontrol.svelte';
	import Solcontrol from '../routes/Solcontrol.svelte';
	import Unicred from '../routes/Unicred.svelte';
	import Srmcred from '../routes/Srmcred.svelte';
	import Home from '../routes/Home.svelte';

	let Route, params={}, active;
	let uri = location.pathname;
	$: active = uri.split('/')

	const router = Navaid('/')
		.on('/', () => Route = Home)
		.on('/Ethcontrol', () => Route = Ethcontrol)
		.on('/Solcontrol', () => Route = Solcontrol)
		.on('/Unicred', () => Route = Unicred)
		.on('/Srmcred', () => Route = Srmcred)
		.listen();

	onDestroy(router.unlisten);
</script>

<main>
	<div class="header-items">
		<img alt="Degen Passport" src="/degenpassport.png" />
		<h1>Degen Passport</h1>
	</div>
	<svelte:component this={Route} {params} />
</main>

<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins&display=swap');

	:global(body) {
		background-color: #333333;
	}

	:global(main) {
		text-align: center;
		max-width: 240px;
		margin: 0 auto;
		display: -webkit-box;  /* OLD - iOS 6-, Safari 3.1-6, BB7 */
		display: -ms-flexbox;  /* TWEENER - IE 10 */
		display: -webkit-flex; /* NEW - Safari 6.1+. iOS 7.1+, BB10 */
		display: grid;         /* NEW, Spec - Firefox, Chrome, Opera */
		justify-content: center;
		align-items: center;
		padding-top: 10%;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
