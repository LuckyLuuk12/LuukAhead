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

<NavBar />
<main style="padding:1rem">
	<slot />
</main>

<style>
	main {
		width: 100%;
		max-width: 100vw;
		overflow: hidden;
	}
</style>