<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let priorities: any[] = [];
	export let types: any[] = [];
	export let statuses = [
		{ value: 'todo', label: 'To Do' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'review', label: 'Review' },
		{ value: 'done', label: 'Done' },
		{ value: 'cancelled', label: 'Cancelled' }
	];

	const dispatch = createEventDispatcher();

	let isExpanded = false;
	let searchText = '';
	let selectedPriorities = new Set<string>();
	let selectedTypes = new Set<string>();
	let selectedStatuses = new Set<string>();
	let filterPanelElement: HTMLDivElement;
	let fabElement: HTMLButtonElement;

	// Initialize with all statuses and priorities selected
	$: if (priorities.length > 0 && selectedPriorities.size === 0) {
		selectedPriorities = new Set(priorities.map(p => p.id));
		emitFilters();
	}
	$: if (types.length > 0 && selectedTypes.size === 0) {
		selectedTypes = new Set(types.map(t => t.id));
		emitFilters();
	}
	$: if (selectedStatuses.size === 0) {
		selectedStatuses = new Set(statuses.map(s => s.value));
		emitFilters();
	}

	function handleClickOutside(event: MouseEvent) {
		if (!isExpanded) return;
		
		const target = event.target as Node;
		if (
			filterPanelElement && 
			!filterPanelElement.contains(target) &&
			fabElement &&
			!fabElement.contains(target)
		) {
			isExpanded = false;
		}
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function togglePriority(priorityId: string) {
		if (selectedPriorities.has(priorityId)) {
			selectedPriorities.delete(priorityId);
		} else {
			selectedPriorities.add(priorityId);
		}
		selectedPriorities = selectedPriorities;
	}

	function toggleType(typeId: string) {
		if (selectedTypes.has(typeId)) {
			selectedTypes.delete(typeId);
		} else {
			selectedTypes.add(typeId);
		}
		selectedTypes = selectedTypes;
	}

	function toggleStatus(statusValue: string) {
		if (selectedStatuses.has(statusValue)) {
			selectedStatuses.delete(statusValue);
		} else {
			selectedStatuses.add(statusValue);
		}
		selectedStatuses = selectedStatuses;
	}

	function toggleAllPriorities() {
		if (selectedPriorities.size === priorities.length) {
			selectedPriorities.clear();
		} else {
			selectedPriorities = new Set(priorities.map(p => p.id));
		}
		selectedPriorities = selectedPriorities;
	}

	function toggleAllTypes() {
		if (selectedTypes.size === types.length) {
			selectedTypes.clear();
		} else {
			selectedTypes = new Set(types.map(t => t.id));
		}
		selectedTypes = selectedTypes;
	}

	function toggleAllStatuses() {
		if (selectedStatuses.size === statuses.length) {
			selectedStatuses.clear();
		} else {
			selectedStatuses = new Set(statuses.map(s => s.value));
		}
		selectedStatuses = selectedStatuses;
	}

	function handleSearchInput() {
		// Trigger reactivity - the reactive block will handle emission
		searchText = searchText;
	}

	function clearFilters() {
		searchText = '';
		selectedPriorities = new Set(priorities.map(p => p.id));
		selectedTypes = new Set(types.map(t => t.id));
		selectedStatuses = new Set(statuses.map(s => s.value));
	}

	function emitFilters() {
		dispatch('filter', {
			searchText,
			priorities: Array.from(selectedPriorities),
			types: Array.from(selectedTypes),
			statuses: Array.from(selectedStatuses)
		});
	}


	// Compute active filter count
	$: activeFilterCount = (() => {
		let count = 0;
		if (searchText.trim()) count++;
		if (selectedPriorities.size < priorities.length) count++;
		if (selectedTypes.size < types.length) count++;
		if (selectedStatuses.size < statuses.length) count++;
		return count;
	})();

	// Reactive filter emission - emit whenever any filter changes
	$: if (searchText !== undefined && selectedPriorities && selectedTypes && selectedStatuses) {
		emitFilters();
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="filter-container">
	<!-- Filter Panel -->
	<div class="filter-panel" class:expanded={isExpanded} bind:this={filterPanelElement}>
		<div class="filter-header">
			<h3>Filters</h3>
			{#if activeFilterCount > 0}
				<button class="clear-btn" on:click={clearFilters} title="Clear all filters">
					Clear ({activeFilterCount})
				</button>
			{/if}
		</div>

		<!-- Search -->
		<div class="filter-section">
			<span class="section-label">Search</span>
			<input
				type="text"
				class="search-input"
				placeholder="Search title, description, remarks..."
				bind:value={searchText}
				on:input={handleSearchInput}
			/>
		</div>

		<!-- Status Filter -->
		<div class="filter-section">
			<div class="section-header">
				<span class="section-label">Status</span>
				<button class="toggle-all-btn" on:click={toggleAllStatuses}>
					{selectedStatuses.size === statuses.length ? 'None' : 'All'}
				</button>
			</div>
			<div class="checkbox-group">
				{#each statuses as status}
					<label class="checkbox-label">
						<input
							type="checkbox"
							checked={selectedStatuses.has(status.value)}
							on:change={() => toggleStatus(status.value)}
						/>
						<span>{status.label}</span>
					</label>
				{/each}
			</div>
		</div>

		<!-- Type Filter -->
		{#if types.length > 0}
			<div class="filter-section">
				<div class="section-header">
					<span class="section-label">Type</span>
					<button class="toggle-all-btn" on:click={toggleAllTypes}>
						{selectedTypes.size === types.length ? 'None' : 'All'}
					</button>
				</div>
				<div class="checkbox-group">
					{#each types as type}
						<label class="checkbox-label">
							<input
								type="checkbox"
								checked={selectedTypes.has(type.id)}
								on:change={() => toggleType(type.id)}
							/>
							<span>{type.name}</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Priority Filter -->
		{#if priorities.length > 0}
			<div class="filter-section">
				<div class="section-header">
					<span class="section-label">Priority</span>
					<button class="toggle-all-btn" on:click={toggleAllPriorities}>
						{selectedPriorities.size === priorities.length ? 'None' : 'All'}
					</button>
				</div>
				<div class="checkbox-group">
					{#each priorities as priority}
						<label class="checkbox-label">
							<input
								type="checkbox"
								checked={selectedPriorities.has(priority.id)}
								on:change={() => togglePriority(priority.id)}
							/>
							<span>{priority.name}</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Floating Action Button -->
	<button
		class="fab"
		class:active={isExpanded}
		on:click={toggleExpanded}
		title={isExpanded ? 'Close filters' : 'Open filters'}
		aria-label={isExpanded ? 'Close filters' : 'Open filters'}
		bind:this={fabElement}
	>
		{#if activeFilterCount > 0}
			<span class="filter-badge">{activeFilterCount}</span>
		{/if}
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="11" cy="11" r="8"></circle>
			<path d="m21 21-4.35-4.35"></path>
		</svg>
	</button>
</div>

<style>
	.filter-container {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 100;
	}

	.fab {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--primary-600);
		color: var(--light-50);
		border: none;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.fab:hover {
		background: var(--primary-500);
		transform: scale(1.05);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
	}

	.fab.active {
		background: var(--primary-700);
	}

	.filter-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		background: var(--red-600);
		color: var(--light-50);
		border-radius: 50%;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 700;
		border: 2px solid var(--card);
	}

	.filter-panel {
		position: absolute;
		bottom: 72px;
		right: 0;
		width: 320px;
		max-height: 70vh;
		background: var(--card);
		border: 1px solid var(--dark-700);
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		overflow: hidden;
		opacity: 0;
		transform: translateY(20px) scale(0.95);
		pointer-events: none;
		transition: all 0.3s ease;
		display: flex;
		flex-direction: column;
	}

	.filter-panel.expanded {
		opacity: 1;
		transform: translateY(0) scale(1);
		pointer-events: all;
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--dark-700);
		background: var(--container);
	}

	.filter-header h3 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--light-100);
		font-weight: 600;
	}

	.clear-btn {
		padding: 0.25rem 0.75rem;
		background: var(--dark-700);
		color: var(--light-300);
		border: 1px solid var(--dark-600);
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
	}

	.clear-btn:hover {
		background: var(--red-700);
		border-color: var(--red-600);
		color: var(--light-50);
	}

	.filter-section {
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--dark-700);
	}

	.filter-section:last-child {
		border-bottom: none;
		overflow-y: auto;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--light-200);
		margin-bottom: 0.5rem;
	}

	.toggle-all-btn {
		padding: 0.25rem 0.5rem;
		background: transparent;
		color: var(--primary-400);
		border: 1px solid var(--primary-600);
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
		transition: all 0.2s;
	}

	.toggle-all-btn:hover {
		background: var(--primary-600);
		color: var(--light-50);
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--dark-800);
		color: var(--light-200);
		border: 1px solid var(--dark-700);
		border-radius: 6px;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary-500);
		box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
	}

	.search-input::placeholder {
		color: var(--light-500);
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		color: var(--light-300);
		font-size: 0.9rem;
		transition: color 0.2s;
	}

	.checkbox-label:hover {
		color: var(--light-100);
	}

	.checkbox-label input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--primary-600);
	}

	.checkbox-label span {
		user-select: none;
	}
</style>
