<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectViewer from '$lib/components/ProjectViewer.svelte';
	let projects = [] as any[];
	let name = '';
	let selected: string | null = null;

	// local edit state
	let edits: Record<string, string> = {};
	let saving: Record<string, boolean> = {};
	let saved: Record<string, boolean> = {};
	let errorMsg: Record<string, string> = {};

	async function load() {
		const res = await fetch('/api/projects');
		if (res.ok) {
			projects = await res.json();
			// initialize edit fields
			edits = {};
			for (const p of projects) edits[p.id] = p.name;
		}
	}

	async function create() {
		const res = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (res.ok) {
			name = '';
			await load();
		}
	}

	// Save a project's name when the input loses focus or Enter is pressed
	async function saveName(id: string) {
		const newName = (edits[id] || '').trim();
		const current = projects.find((p) => p.id === id)?.name || '';
		errorMsg[id] = '';
		if (!newName) {
			errorMsg[id] = 'Name cannot be empty';
			edits[id] = current;
			return;
		}
		if (newName === current) return; // nothing to do

		// local duplicate check (case-insensitive) to avoid unnecessary calls
		const dup = projects.find((p) => p.id !== id && p.name.toLowerCase() === newName.toLowerCase());
		if (dup) {
			errorMsg[id] = 'A project with this name already exists';
			edits[id] = current;
			return;
		}

		saving[id] = true;
		try {
			const res = await fetch(`/api/projects/${id}`, {
				method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName })
			});
			if (res.status === 409) {
				errorMsg[id] = 'A project with this name already exists';
				edits[id] = current;
			} else if (!res.ok) {
				errorMsg[id] = 'Failed to save name';
				edits[id] = current;
			} else {
				// success: update local list and show a brief saved indicator
				const p = projects.find((p) => p.id === id);
				if (p) p.name = newName;
				saved[id] = true;
				setTimeout(() => { saved[id] = false; }, 1500);
			}
		} finally {
			saving[id] = false;
		}
	}

	async function deleteProject(id: string) {
		if (!confirm('Delete this project and all its items? This cannot be undone.')) return;
		const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
		if (res.ok) {
			// refresh
			await load();
			if (selected === id) selected = null;
		} else {
			alert('Failed to delete project');
		}
	}

	onMount(load);
</script>

<div class="projects-page">
	<div class="page-header">
		<h1>Projects</h1>
		<div class="create-project">
			<input bind:value={name} placeholder="New project name" class="input-field" />
			<button on:click={create} class="btn-primary">+ Create</button>
		</div>
	</div>

	<div class="projects-container">
		<div class="projects-list">
			<h3>Your Projects</h3>
			<ul>
				{#each projects as p}
					<li class:selected={selected === p.id}>
						<input
							value={edits[p.id]}
							on:input={(e) => edits[p.id] = (e.target as HTMLInputElement).value}
							on:blur={() => saveName(p.id)}
							on:keydown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
							class="project-name-input"
						/>
						<button on:click={() => (selected = p.id)} title="Open" class="btn-open">Open</button>
						{#if saving[p.id]}
							<span class="status saving">Saving…</span>
						{:else if saved[p.id]}
							<span class="status saved">✓</span>
						{:else if errorMsg[p.id]}
							<span class="status error">{errorMsg[p.id]}</span>
						{/if}
						<button on:click={() => deleteProject(p.id)} title="Delete project" class="btn-delete">🗑️</button>
					</li>
				{/each}
			</ul>
		</div>
		<div class="project-content">
			{#if selected}
				<ProjectViewer projectId={selected} />
			{:else}
				<div class="empty-state">
					<p>Select a project to view</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.projects-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 1rem;
	}
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--primary-500);
	}
	.page-header h1 {
		margin: 0;
		color: var(--light-100);
	}
	.create-project {
		display: flex;
		gap: 0.5rem;
	}
	.input-field {
		padding: 0.5rem 1rem;
		border: 1px solid var(--dark-600);
		border-radius: 6px;
		background: var(--container);
		color: var(--light-100);
		min-width: 200px;
	}
	.btn-primary {
		padding: 0.5rem 1.5rem;
		background: var(--primary-500);
		color: var(--light-50);
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-primary:hover {
		background: var(--primary-600);
	}
	.projects-container {
		display: flex;
		gap: 1.5rem;
		flex: 1;
		overflow: hidden;
	}
	.projects-list {
		width: 320px;
		background: var(--card);
		border-radius: 8px;
		padding: 1rem;
		overflow-y: auto;
		box-shadow: 0 2px 8px rgba(0,0,0,0.2);
	}
	.projects-list h3 {
		margin: 0 0 1rem 0;
		color: var(--primary-400);
		font-size: 1.1rem;
	}
	.projects-list ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.projects-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		background: var(--container);
		border-radius: 6px;
		border: 1px solid var(--dark-700);
		transition: all 0.2s;
		max-width: 100%;
	}
	.projects-list li:hover {
		border-color: var(--primary-600);
	}
	.projects-list li.selected {
		border-color: var(--primary-500);
		background: var(--primary-900);
	}
	.project-name-input {
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--dark-700);
		border-radius: 4px;
		background: var(--background);
		color: var(--light-100);
		font-size: 0.95rem;
		width: 100%;
	}
	.btn-open {
		padding: 0.25rem 0.75rem;
		background: var(--primary-700);
		color: var(--light-100);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background 0.2s;
	}
	.btn-open:hover {
		background: var(--primary-600);
	}
	.btn-delete {
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 1.1rem;
		opacity: 0.6;
		transition: opacity 0.2s;
	}
	.btn-delete:hover {
		opacity: 1;
	}
	.status {
		font-size: 0.85rem;
	}
	.status.saving {
		color: var(--light-400);
	}
	.status.saved {
		color: var(--green-500);
	}
	.status.error {
		color: var(--red-500);
		font-size: 0.8rem;
	}
	.project-content {
		flex: 1;
		background: var(--card);
		border-radius: 8px;
		padding: 1rem;
		overflow: auto;
		box-shadow: 0 2px 8px rgba(0,0,0,0.2);
	}
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--light-400);
		font-size: 1.1rem;
	}
</style>
