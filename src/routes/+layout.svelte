<script lang="ts">
	import '$lib/styles/global.scss';
	import favicon from '$lib/assets/favicon.svg';
	import NavBar from '$lib/components/NavBar.svelte';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<title>LuukAhead</title>
</svelte:head>

<div class="app-container">
	<NavBar />
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