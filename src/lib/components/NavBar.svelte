<script lang="ts">
	import { page } from '$app/stores';
	import { onDestroy } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	let current = '';
	const unsub = page.subscribe((p) => (current = p.url.pathname));
	onDestroy(unsub);
</script>

<nav class="navbar">
	<div class="logo">
		<img src={favicon} alt="LuukAhead" />
		<span>LuukAhead</span>
	</div>
	<a href="/projects" class:active={current === '/projects'}>Projects</a>
	<a href="/demo/lucia" class:active={current.startsWith('/demo')}>Demo</a>
	<div class="spacer"></div>
	<a href="/login" class="login-btn">Login</a>
</nav>

<style>
	.navbar {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 0.75rem 1.5rem;
		background: var(--card);
		border-bottom: 2px solid var(--primary-500);
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 1.25rem;
		color: var(--primary-500);
	}
	.logo img {
		width: 32px;
		height: 32px;
	}
	.navbar a {
		text-decoration: none;
		color: var(--light-200);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: all 0.2s ease;
		font-weight: 500;
	}
	.navbar a:hover {
		background: var(--primary-700);
		color: var(--light-50);
	}
	.navbar a.active {
		background: var(--primary-500);
		color: var(--light-50);
	}
	.spacer {
		flex: 1;
	}
	.login-btn {
		border: 1px solid var(--primary-500);
	}
</style>

