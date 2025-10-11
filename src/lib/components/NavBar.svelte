<script lang="ts">
	import favicon from '$lib/assets/favicon.png';
	import type { SessionValidationResult } from '$lib/server/auth';
	import { clearAllPasskeys } from '$lib/stores/passkeys';

	export let user: SessionValidationResult['user'];

	function onLogoutSubmit(e: Event) {
		try {
			// clear all passkeys from the client-side store before the logout post
			clearAllPasskeys();
		} catch (err) {
			// don't block logout if clearing fails
			console.warn('Failed to clear passkeys on logout', err);
		}
		// allow the form to submit normally
	}
</script>

<nav class="navbar">
	<a href="/" class="logo">
		<img src={favicon} alt="LuukAhead" />
		<span>LuukAhead</span>
	</a>
	<div class="spacer"></div>
	{#if user}
		<span class="username">Hi, {user.username}!</span>
		<form method="POST" action="/logout" on:submit={onLogoutSubmit}>
			<button type="submit" class="logout-btn">Logout</button>
		</form>
	{:else}
		<a href="/login" class="login-btn">Login</a>
	{/if}
</nav>

<style>
	.navbar {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 0.25rem 1.5rem;
		background: var(--card);
		border-bottom: 3px solid var(--primary-500);
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		font-weight: 700;
		font-size: 1.25rem;
		color: var(--primary-500);
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: color 0.2s ease;
	}
	.logo:hover {
		color: var(--primary-400);
	}
	.logo img {
		width: 3rem;
		height: 3rem;
		border-radius: var(--border-radius-large);
	}
	.navbar a:not(.logo) {
		text-decoration: none;
		color: var(--light-200);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: all 0.2s ease;
		font-weight: 500;
	}
	.navbar a:not(.logo):hover {
		background: var(--primary-700);
		color: var(--light-50);
	}
	.spacer {
		flex: 1;
	}
	.login-btn {
		border: 1px solid var(--primary-500);
	}
	.username {
		color: var(--light-100);
		font-weight: 500;
		padding: 0.5rem 1rem;
	}
	form {
		margin: 0;
	}
	.logout-btn {
		background: transparent;
		border: 1px solid var(--red-500);
		color: var(--red-200);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
		font-size: 1rem;
	}
	.logout-btn:hover {
		background: var(--red-700);
		color: var(--light-50);
	}
</style>

