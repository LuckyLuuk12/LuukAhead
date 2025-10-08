<script lang="ts">
	import { page } from '$app/stores';
	import { onDestroy } from 'svelte';
	let current = '';
	const unsub = page.subscribe((p) => (current = p.url.pathname));
	onDestroy(unsub);
</script>

<nav style="display:flex; align-items:center; gap:1rem; padding:0.5rem 1rem; border-bottom:1px solid #eee">
	<div style="font-weight:700">LuukAhead</div>
	<a href="/projects" class:active={current === '/projects'}>Projects</a>
	<a href="/demo/lucia" class:active={current.startsWith('/demo')}>Demo</a>
	<div style="margin-left:auto">
		<a href="/login">Login</a>
	</div>
</nav>

