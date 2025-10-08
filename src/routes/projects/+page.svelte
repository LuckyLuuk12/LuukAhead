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

<h1>Projects</h1>
<div>
	<input bind:value={name} placeholder="New project name" />
	<button on:click={create}>Create</button>
</div>

<div style="display:flex; gap:1rem;">
	<div style="width: fit-content; border-right:1px solid #eee; padding-right:1rem;">
		<h3>Your projects</h3>
		<ul>
			{#each projects as p}
				<li style="display:flex; align-items:center; gap:0.5rem;">
					<input
						value={edits[p.id]}
						on:input={(e) => edits[p.id] = (e.target as HTMLInputElement).value}
						on:blur={() => saveName(p.id)}
						on:keydown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
						style="width:160px"
					/>
					<button on:click={() => (selected = p.id)} title="Open" style="background:none;border:0;color:blue;cursor:pointer">Open</button>
					{#if saving[p.id]}
						<span style="color:gray">Saving…</span>
					{:else if saved[p.id]}
						<span style="color:green">✓</span>
					{:else if errorMsg[p.id]}
						<span style="color:crimson">{errorMsg[p.id]}</span>
					{/if}
					<button on:click={() => deleteProject(p.id)} title="Delete project" style="margin-left:auto">🗑️</button>
				</li>
			{/each}
		</ul>
	</div>
	<div style="flex:1; padding-left:1rem;">
		{#if selected}
			<ProjectViewer projectId={selected} />
		{:else}
			<p>Select a project to view</p>
		{/if}
	</div>
</div>
