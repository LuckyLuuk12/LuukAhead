<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectViewer from '$lib/components/ProjectViewer.svelte';
	let projects = [] as any[];
	let name = '';
	let selected: string | null = null;
	let showProjectsList: boolean = true;

	// Passkey management (stored in memory only, per project)
	let projectPasskeys = new Map<string, string>(); // projectId -> passkey
	let passkeyInput = ''; // Input for current project's passkey
	let showPasskeyWarning = false;
	let passkeyError = '';

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
			if (selected === id) {
				selected = null;
				projectPasskeys.delete(id);
				passkeyInput = '';
			}
		} else {
			alert('Failed to delete project');
		}
	}

	// Set passkey for current project
	function setPasskey() {
		if (!selected) return;
		if (!passkeyInput.trim()) {
			passkeyError = 'Passkey cannot be empty';
			return;
		}
		projectPasskeys.set(selected, passkeyInput);
		projectPasskeys = projectPasskeys; // trigger reactivity
		passkeyError = '';
		showPasskeyWarning = false;
	}

	// Clear passkey for current project
	function clearPasskey() {
		if (!selected) return;
		projectPasskeys.delete(selected);
		projectPasskeys = projectPasskeys;
		passkeyInput = '';
	}

	// Get passkey for a project (returns empty string if not set)
	function getPasskey(projectId: string): string {
		return projectPasskeys.get(projectId) || '';
	}

	// Check if current project has passkey set
	$: hasPasskey = selected ? projectPasskeys.has(selected) : false;
	$: currentPasskey = selected ? getPasskey(selected) : '';

	// Update passkeyInput when project selection changes
	$: if (selected) {
		passkeyInput = getPasskey(selected);
	}

	onMount(load);
</script>

<div class="projects-page">
	<div class="page-header">
			<div class="title-row">
				<h1>Projects</h1>
			</div>
		<div class="header-controls">
			<div class="create-project">
				<input bind:value={name} placeholder="New project name" class="input-field" />
				<button on:click={create} class="btn-primary">+ Create</button>
			</div>
			
			{#if selected}
				<div class="passkey-section">
					<div class="passkey-header">
						<label for="passkey-input" class="passkey-label">
							🔐 Encryption Passkey
							<button 
								class="info-btn" 
								on:click={() => showPasskeyWarning = !showPasskeyWarning}
								title="What is this?"
								type="button"
							>
								ⓘ
							</button>
						</label>
						{#if hasPasskey}
							<span class="passkey-status active">✓ Active</span>
						{:else}
							<span class="passkey-status inactive">⚠️ Not Set</span>
						{/if}
					</div>
					<div class="passkey-input-row">
						<input
							id="passkey-input"
							type="password"
							bind:value={passkeyInput}
							placeholder="Enter passkey for this project..."
							class="input-field passkey-input"
							on:keydown={(e) => { if (e.key === 'Enter') setPasskey(); }}
						/>
						<button on:click={setPasskey} class="btn-secondary" title="Set passkey">
							Set
						</button>
						{#if hasPasskey}
							<button on:click={clearPasskey} class="btn-danger-small" title="Clear passkey">
								Clear
							</button>
						{/if}
					</div>
					{#if passkeyError}
						<div class="passkey-error">{passkeyError}</div>
					{/if}
					{#if showPasskeyWarning}
						<div class="passkey-warning">
							<strong>⚠️ Important:</strong> Your passkey encrypts all sensitive data (titles, descriptions, remarks) 
							<strong>before</strong> it's sent to the server. The server cannot read your encrypted data.
							<br><br>
							<strong>You MUST remember this passkey!</strong> If you lose it, your data cannot be recovered.
							<br><br>
							💡 Tip: Each project can have a different passkey. Leave blank to disable encryption.
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

		<div class="projects-container">
			{#if showProjectsList}
				<div class="projects-list">
				<div class="projects-list-header">
					<button class="list-collapse-btn" title="Collapse" on:click={() => showProjectsList = false} aria-label="Collapse projects list">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="15 18 9 12 15 6"></polyline>
						</svg>
					</button>
					<h3>Your Projects</h3>
				</div>
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
			{:else}
				<div class="projects-collapsed-bar" title="Open projects list" on:click={() => showProjectsList = true} aria-label="Open projects list" on:keypress={(e) => { if (e.key === 'Enter' || e.key === ' ') showProjectsList = true; }} tabindex="0" role="button">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</div>
			{/if}
		<div class="project-content">
			{#if selected}
				{#if hasPasskey || !passkeyInput}
					<ProjectViewer projectId={selected} passkey={currentPasskey} />
				{:else}
					<div class="empty-state passkey-required">
						<div class="passkey-prompt">
							<h2>🔐 Passkey Required</h2>
							<p>Please set a passkey above to view or edit this project.</p>
							<p class="hint">Or leave it blank if you don't want encryption.</p>
						</div>
					</div>
				{/if}
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
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--primary-500);
	}
	.page-header h1 {
		margin: 0;
		color: var(--light-100);
	}
	.header-controls {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		flex-wrap: wrap;
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
	.btn-secondary {
		padding: 0.5rem 1rem;
		background: var(--dark-700);
		color: var(--light-100);
		border: 1px solid var(--dark-600);
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-secondary:hover {
		background: var(--dark-600);
		border-color: var(--primary-500);
	}
	.btn-danger-small {
		padding: 0.5rem 1rem;
		background: transparent;
		color: var(--red-400);
		border: 1px solid var(--red-600);
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-danger-small:hover {
		background: var(--red-700);
		border-color: var(--red-600);
		color: var(--light-50);
	}
	.passkey-section {
		flex: 1;
		max-width: 600px;
		background: var(--container);
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid var(--dark-700);
	}
	.passkey-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.passkey-label {
		color: var(--light-200);
		font-size: 0.9rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.info-btn {
		background: transparent;
		border: 1px solid var(--dark-600);
		color: var(--light-400);
		width: 20px;
		height: 20px;
		border-radius: 50%;
		cursor: pointer;
		font-size: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		padding: 0;
	}
	.info-btn:hover {
		background: var(--dark-700);
		border-color: var(--primary-500);
		color: var(--primary-400);
	}
	.passkey-status {
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
	}
	.passkey-status.active {
		background: var(--green-900);
		color: var(--green-400);
		border: 1px solid var(--green-700);
	}
	.passkey-status.inactive {
		background: var(--dark-800);
		color: var(--light-400);
		border: 1px solid var(--dark-600);
	}
	.passkey-input-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.passkey-input {
		flex: 1;
	}
	.passkey-error {
		color: var(--red-400);
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}
	.passkey-warning {
		margin-top: 1rem;
		padding: 1rem;
		background: var(--dark-800);
		border-left: 3px solid var(--primary-500);
		border-radius: 4px;
		color: var(--light-300);
		font-size: 0.9rem;
		line-height: 1.6;
	}
	.passkey-warning strong {
		color: var(--light-100);
	}
	.passkey-required {
		background: var(--container);
	}
	.passkey-prompt {
		text-align: center;
		padding: 2rem;
	}
	.passkey-prompt h2 {
		color: var(--light-100);
		margin-bottom: 1rem;
	}
	.passkey-prompt p {
		color: var(--light-300);
		margin: 0.5rem 0;
	}
	.passkey-prompt .hint {
		font-size: 0.9rem;
		color: var(--light-400);
		font-style: italic;
	}
	.projects-container {
		display: flex;
		gap: 0.5rem;
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

	.projects-collapsed-bar {
		width: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255,255,255,0.2);
		border-radius: 4px;
		cursor: pointer;
		color: var(--light-200);
		border: 1px solid rgba(255,255,255,0.03);
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.projects-list-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.list-collapse-btn {
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: 1px solid var(--dark-700);
		border-radius: 6px;
		cursor: pointer;
		color: var(--light-200);
	}

	.list-collapse-btn:hover {
		background: var(--dark-700);
		color: var(--light-100);
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
		padding: 0.05rem;
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
