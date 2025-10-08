<script lang="ts">
	import '$lib/styles/global.scss';
	import favicon from '$lib/assets/favicon.png';
	import NavBar from '$lib/components/NavBar.svelte';
	import type { LayoutData } from './$types';

	export let data: LayoutData;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<title>LuukAhead</title>
</svelte:head>

<div class="app-container">
	<NavBar user={data.user} />
	<main>
		<slot />
	</main>
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
		background: var(--background);
	}
	main {
		flex: 1;
		overflow: auto;
		padding: 1.5rem;
	}
</style>