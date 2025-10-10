<script lang="ts">
	import { onMount } from 'svelte';
	import Layer from './Layer.svelte';
	import ProjectSidebar from './ProjectSidebar.svelte';
	export let projectId: string;

	let items: any[] = [];
	let types: any[] = [];
	let priorities: any[] = [];
	let showSidebar: boolean = false; // sidebar hidden by default
	let viewMode: 'tree' | 'pyramid' | 'columns' = 'pyramid'; // default to pyramid view
	let columnGroupBy: 'type' | 'status' | 'priority' = 'type'; // how to group columns
	let expandedNodes = new Set<string>(); // track which nodes are expanded
	let previousViewMode: 'tree' | 'pyramid' | 'columns' = viewMode;
	
	// Quick Edit Mode state
	let quickEditMode = false;
	let pendingChanges = new Map<string, any>(); // itemId -> changes
	let draggedItem: any = null;

	// Disable Quick Edit Mode when switching to Type grouping
	$: if (columnGroupBy === 'type' && quickEditMode) {
		quickEditMode = false;
		pendingChanges.clear();
		pendingChanges = pendingChanges;
	}

	// When switching view modes, adjust expanded state
	$: if (viewMode !== previousViewMode) {
		if (viewMode === 'tree') {
			// In tree mode, expand all nodes by default
			expandedNodes = new Set(items.map(item => item.id));
		} else {
			// In pyramid mode, collapse all except root
			if (rootNode) {
				expandedNodes = new Set([rootNode.id]);
			}
		}
		previousViewMode = viewMode;
	}

	async function loadItems() {
		if (!projectId) return;
		const res = await fetch(`/api/projects/${projectId}/work-items`);
		if (res.ok) items = await res.json();
		else console.error('failed to load items', res.status);


	}

	async function loadTypes() {
		if (!projectId) return;
		const res = await fetch(`/api/projects/${projectId}/item-types`);
		if (res.ok) types = await res.json();
		else console.error('failed to load types', res.status);


	}

	async function loadPriorities() {
		if (!projectId) return;
		const res = await fetch(`/api/projects/${projectId}/priorities`);
		if (res.ok) priorities = await res.json();
		else console.error('failed to load priorities', res.status);
	}

	function toggleExpand(nodeId: string) {
		if (expandedNodes.has(nodeId)) {
			expandedNodes.delete(nodeId);
		} else {
			expandedNodes.add(nodeId);
		}
		expandedNodes = expandedNodes; // trigger reactivity
	}

	onMount(async () => {
		await Promise.all([loadTypes(), loadPriorities()]);
		await loadItems();
	});

	function buildTree(list: any[]) {
		const map = new Map<string, any>();
		list.forEach((it) => map.set(it.id, { ...it, children: [] }));
		const roots: any[] = [];
		map.forEach((node) => {
			if (node.parent_id) {
				const p = map.get(node.parent_id);
				if (p) p.children.push(node);
				else roots.push(node);
			} else {
				roots.push(node);
			}
		});
		return roots;
	}

	let tree: any[] = [];

	// compute tree and set depth per node
	$: {
		tree = buildTree(items);
		function setDepth(node: any, depth = 0) {
			node.depth = depth;
			if (node.children) node.children.forEach((c: any) => setDepth(c, depth + 1));
		}

		tree.forEach((r) => setDepth(r, 0));

	}

	

	let rootNode: any = null;
	$: rootNode = tree.find((r) => r.is_root) ?? (tree.length ? tree[0] : null);

	// Auto-expand root node when it becomes available in pyramid mode
	$: if (viewMode === 'pyramid' && rootNode && !expandedNodes.has(rootNode.id)) {
		expandedNodes.add(rootNode.id);
		expandedNodes = expandedNodes; // trigger reactivity
	}

	// For pyramid view, we need to organize nodes by depth level
	// This needs to be reactive to both rootNode AND expandedNodes
	$: pyramidLayers = (() => {
		if (!rootNode) return [];
		const layers: any[][] = [];
		
		function traverse(node: any, depth: number) {
			if (!layers[depth]) layers[depth] = [];
			layers[depth].push(node);
			
			// In pyramid mode, only traverse children if node is expanded
			if (expandedNodes.has(node.id)) {
				if (node.children) {
					node.children.forEach((child: any) => traverse(child, depth + 1));
				}
			}
		}
		
		traverse(rootNode, 0);
		return layers;
	})();

// Columns view: group items by type, status, or priority
$: columns = (() => {
	// produce an array of columns based on columnGroupBy mode
	const cols: any[] = [];
	if (!items || items.length === 0) return cols;

	// Build a depth map from the already-computed `tree` structure for type-based grouping
	const depthMap = new Map<string, number>();
	function walk(node: any) {
		depthMap.set(node.id, node.depth ?? 0);
		if (node.children) node.children.forEach((c: any) => walk(c));
	}
	tree.forEach((r) => walk(r));

	if (columnGroupBy === 'type') {
		// Group by item type (depth-based)
		const typeCount = Math.max(0, types?.length || 0);
		for (let i = 0; i < typeCount; i++) cols.push([]);
		const backlog: any[] = [];

		items.forEach((it) => {
			if (it.is_root) return; // skip root
			const depth = depthMap.get(it.id) ?? 0;
			const typeIdx = Math.max(0, depth - 1);
			const node = { ...it, depth };
			if (typeIdx >= 0 && typeIdx < typeCount) {
				cols[typeIdx].push(node);
			} else {
				backlog.push(node);
			}
		});

		if (backlog.length) cols.push(backlog);
	} else if (columnGroupBy === 'status') {
		// Group by status - use pending changes if in quick edit mode
		const statuses = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
		statuses.forEach(() => cols.push([]));

		items.forEach((it) => {
			if (it.is_root) return; // skip root
			const depth = depthMap.get(it.id) ?? 0;
			
			// Check if there's a pending change for this item's status
			const pendingChange = pendingChanges.get(it.id);
			const currentStatus = pendingChange?.status ?? it.status ?? 'todo';
			
			const statusIdx = statuses.indexOf(currentStatus);
			const node = { ...it, depth };
			if (statusIdx >= 0) {
				cols[statusIdx].push(node);
			} else {
				cols[0].push(node); // default to todo
			}
		});
	} else if (columnGroupBy === 'priority') {
		// Group by priority - use pending changes if in quick edit mode
		const prioCount = Math.max(0, priorities?.length || 0);
		for (let i = 0; i < prioCount; i++) cols.push([]);
		const backlog: any[] = [];

		items.forEach((it) => {
			if (it.is_root) return; // skip root
			const depth = depthMap.get(it.id) ?? 0;
			const node = { ...it, depth };
			
			// Check if there's a pending change for this item's priority
			const pendingChange = pendingChanges.get(it.id);
			const currentPriorityId = pendingChange?.priority_id !== undefined 
				? pendingChange.priority_id 
				: it.priority_id;
			
			if (currentPriorityId) {
				const prio = priorities.find(p => p.id === currentPriorityId);
				if (prio) {
					const prioIdx = priorities.findIndex(p => p.id === currentPriorityId);
					if (prioIdx >= 0 && prioIdx < prioCount) {
						cols[prioIdx].push(node);
					} else {
						backlog.push(node);
					}
				} else {
					backlog.push(node);
				}
			} else {
				backlog.push(node);
			}
		});

		if (backlog.length) cols.push(backlog);
	}

	return cols;
})();

// Column headers based on grouping mode
$: columnHeaders = (() => {
	if (columnGroupBy === 'type') {
		const headers = types.map(t => t.name);
		if (columns.length > types.length) headers.push('Backlog');
		return headers;
	} else if (columnGroupBy === 'status') {
		return ['To Do', 'In Progress', 'Review', 'Done', 'Cancelled'];
	} else if (columnGroupBy === 'priority') {
		const headers = priorities.map(p => p.name);
		if (columns.length > priorities.length) headers.push('No Priority');
		return headers;
	}
	return [];
})();

// Quick Edit Mode functions
function toggleQuickEditMode() {
	if (quickEditMode && pendingChanges.size > 0) {
		const shouldDiscard = confirm('You have unsaved changes. Discard them?');
		if (!shouldDiscard) return;
	}
	quickEditMode = !quickEditMode;
	if (!quickEditMode) {
		pendingChanges.clear();
		pendingChanges = pendingChanges;
	}
}

async function confirmChanges() {
	if (pendingChanges.size === 0) {
		quickEditMode = false;
		return;
	}

	// Prepare batch update payload
	const updates = Array.from(pendingChanges.entries()).map(([itemId, changes]) => ({
		id: itemId,
		...changes
	}));

	try {
		const res = await fetch(`/api/projects/${projectId}/work-items/batch`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ updates })
		});

		if (res.ok) {
			await loadItems();
			pendingChanges.clear();
			pendingChanges = pendingChanges;
			quickEditMode = false;
		} else {
			const error = await res.text();
			alert(`Failed to save changes: ${error}`);
		}
	} catch (error) {
		alert(`Failed to save changes: ${error}`);
	}
}

function cancelChanges() {
	if (pendingChanges.size > 0) {
		const shouldCancel = confirm('Discard all unsaved changes?');
		if (!shouldCancel) return;
	}
	pendingChanges.clear();
	pendingChanges = pendingChanges;
	quickEditMode = false;
}

function handleDragStart(e: DragEvent, item: any) {
	if (!quickEditMode) return;
	draggedItem = item;
	e.dataTransfer!.effectAllowed = 'move';
	e.dataTransfer!.setData('text/plain', item.id);
}

function handleDragOver(e: DragEvent) {
	if (!quickEditMode || !draggedItem) return;
	e.preventDefault();
	e.dataTransfer!.dropEffect = 'move';
}

function handleDrop(e: DragEvent, columnIndex: number) {
	e.preventDefault();
	if (!quickEditMode || !draggedItem) return;

	const itemId = draggedItem.id;
	let changes: any = {};

	if (columnGroupBy === 'type') {
		// Update type_id based on column
		const targetType = types[columnIndex];
		if (targetType) {
			changes.type_id = targetType.id;
		}
	} else if (columnGroupBy === 'status') {
		// Update status based on column
		const statuses = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
		changes.status = statuses[columnIndex];
	} else if (columnGroupBy === 'priority') {
		// Update priority_id based on column
		const targetPriority = priorities[columnIndex];
		if (targetPriority) {
			changes.priority_id = targetPriority.id;
		} else {
			// Last column is "No Priority"
			changes.priority_id = null;
		}
	}

	// Merge with existing pending changes for this item
	const existing = pendingChanges.get(itemId) || {};
	pendingChanges.set(itemId, { ...existing, ...changes });
	pendingChanges = pendingChanges;

	draggedItem = null;
}

</script>

<div class="project-viewer-wrap">
	<div class="top-section">
		<div class="viewer-header">
			<div class="left-controls">
				{#if viewMode === 'columns' && (columnGroupBy === 'status' || columnGroupBy === 'priority')}
					{#if !quickEditMode}
						<button 
							class="quick-edit-btn" 
							on:click={toggleQuickEditMode}
							title="Enable Quick Edit Mode - drag items between columns"
						>
							✏️ Quick Edit
						</button>
					{:else}
						<div class="edit-mode-controls">
							<span class="edit-mode-label">✏️ Quick Edit Mode</span>
							<button class="btn-confirm" on:click={confirmChanges} title="Save all changes">
								✓ Confirm {pendingChanges.size > 0 ? `(${pendingChanges.size})` : ''}
							</button>
							<button class="btn-cancel" on:click={cancelChanges} title="Discard changes">
								✖ Cancel
							</button>
						</div>
					{/if}
				{/if}
			</div>
			<div class="view-toggle">
				<button 
					class="toggle-btn" 
					class:active={viewMode === 'tree'} 
					on:click={() => { viewMode = 'tree' }}
					title="Tree view - show all nested items"
				>
					📋 Tree
				</button>
				<button 
					class="toggle-btn" 
					class:active={viewMode === 'pyramid'} 
					on:click={() => { viewMode = 'pyramid' }}
					title="Pyramid view - expand items on demand"
				>
					🔺 Pyramid
				</button>
				<button 
					class="toggle-btn" 
					class:active={viewMode === 'columns'} 
					on:click={() => { viewMode = 'columns' }}
					title="Columns view - one column per type"
				>
					📋 Columns
				</button>
				{#if viewMode === 'columns'}
					<select bind:value={columnGroupBy} class="group-select" title="Group columns by">
						<option value="type">Group by Type</option>
						<option value="status">Group by Status</option>
						<option value="priority">Group by Priority</option>
					</select>
				{/if}
				<button
					class="settings-btn"
					class:active={showSidebar}
					on:click={() => (showSidebar = !showSidebar)}
					title="Toggle sidebar"
					aria-label="Toggle sidebar"
				>
					⚙️
				</button>
			</div>
		</div>
	</div>
	<div class="bottom-section">
		<div class="project-viewer" class:pyramid-mode={viewMode === 'pyramid'} class:full-width={!showSidebar}>
			{#if tree.length === 0}
				<div class="empty-message">No items yet — add items using the sidebar</div>
			{:else if viewMode === 'pyramid'}
				<!-- Pyramid view: horizontal layers -->
				{#each pyramidLayers as layer, depth}
					<div class="pyramid-layer" data-depth={depth}>
						{#each layer as node}
							<Layer 
								{node}
								{projectId}
								{types}
								{priorities}
								{viewMode}
								{expandedNodes}
								standalone={true}
								on:created={() => loadItems()}
								on:toggle={(e) => toggleExpand(e.detail)}
							/>
						{/each}
					</div>
				{/each}
				
				{:else if viewMode === 'columns'}
					<!-- Columns view: one column per type/status/priority -->
					<div class="columns-view">
						{#each columns as col, idx}
							<div 
								class="column" 
								class:drop-zone={quickEditMode}
								data-index={idx}
								role="columnheader"
								tabindex="0"
								on:dragover={handleDragOver}
								on:drop={(e) => handleDrop(e, idx)}
							>
								<div class="column-header">{columnHeaders[idx] ?? `Column ${idx+1}`}</div>
								<div class="column-body">
									{#each col as node}
										<div
											draggable={quickEditMode}
											role="option"
											aria-selected="false"
											tabindex="0"
											on:dragstart={(e) => handleDragStart(e, node)}
											class:draggable-item={quickEditMode}
											class:has-changes={pendingChanges.has(node.id)}
										>
											<Layer node={node} {projectId} {types} {priorities} viewMode={'columns'} expandedNodes={expandedNodes} standalone={true} on:created={() => loadItems()} />
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<!-- Tree view: traditional nested -->
					{#if rootNode}
					<Layer 
						node={rootNode} 
						{projectId} 
						{types} 
						{priorities}
						{viewMode}
						{expandedNodes}
						standalone={false}
						on:created={() => loadItems()}
						on:toggle={(e) => toggleExpand(e.detail)}
					/>
				{/if}
			{/if}
		</div>
		{#if showSidebar}
			<ProjectSidebar projectId={projectId} on:changed={() => loadItems()} />
		{/if}
	</div>
</div>

<style>
	.project-viewer-wrap {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		position: relative;
	}
	.top-section {
		flex-shrink: 0;
		background: var(--card);
		border-bottom: 1px solid var(--dark-700);
	}
	.viewer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}
	.left-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.quick-edit-btn {
		padding: 0.5rem 1rem;
		background: var(--primary-600);
		color: var(--light-50);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
		font-weight: 500;
	}
	.quick-edit-btn:hover {
		background: var(--primary-500);
	}
	.edit-mode-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		background: var(--dark-800);
		border: 1px solid var(--primary-600);
		border-radius: 6px;
	}
	.edit-mode-label {
		color: var(--primary-400);
		font-size: 0.9rem;
		font-weight: 600;
		padding: 0 0.5rem;
	}
	.btn-confirm {
		padding: 0.4rem 0.8rem;
		background: var(--primary-600);
		color: var(--light-50);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s;
	}
	.btn-confirm:hover {
		background: var(--primary-500);
	}
	.btn-cancel {
		padding: 0.4rem 0.8rem;
		background: var(--dark-700);
		color: var(--light-200);
		border: 1px solid var(--dark-600);
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s;
	}
	.btn-cancel:hover {
		background: var(--red-700);
		border-color: var(--red-600);
		color: var(--light-50);
	}
	.view-toggle {
		display: flex;
		gap: 0.5rem;
		background: var(--container);
		padding: 0.25rem;
		border-radius: 6px;
		border: 1px solid var(--dark-700);
	}
	.toggle-btn {
		padding: 0.5rem 1rem;
		background: transparent;
		color: var(--light-300);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
		font-weight: 500;
	}
	.toggle-btn:hover {
		background: var(--dark-700);
		color: var(--light-100);
	}
	.toggle-btn.active {
		background: var(--primary-600);
		color: var(--light-50);
	}
	.group-select {
		padding: 0.5rem 0.75rem;
		background: var(--dark-800);
		color: var(--light-200);
		border: 1px solid var(--dark-700);
		border-radius: 4px;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.group-select:hover {
		background: var(--dark-700);
		border-color: var(--primary-500);
	}
	.group-select:focus {
		outline: none;
		border-color: var(--primary-500);
		box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
	}
	.bottom-section {
		flex: 1;
		display: flex;
		gap: 1.5rem;
		overflow: hidden;
	}
	.project-viewer {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
	}

	.project-viewer.full-width {
		/* when sidebar hidden, take full area */
		margin-right: 0;
	}

	.settings-btn {
		padding: 0.35rem 0.6rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		color: var(--light-300);
		font-size: 0.95rem;
	}
	.settings-btn:hover {
		background: var(--dark-700);
		color: var(--light-100);
	}
	.settings-btn.active {
		background: var(--primary-600);
		color: var(--light-50);
	}
	.project-viewer.pyramid-mode {
		gap: 0;
	}
	.pyramid-layer {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 1rem 0.5rem;
		border-bottom: 2px solid var(--dark-700);
		align-items: flex-start;
		justify-content: center;
	}
	.pyramid-layer:last-child {
		border-bottom: none;
	}
	.pyramid-layer[data-depth="0"] {
		background: var(--card);
		border-bottom-color: var(--primary-700);
	}
	.empty-message {
		padding: 2rem;
		color: var(--light-400);
		font-size: 1rem;
	}

	/* Columns view styles */
	.columns-view {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		padding: 0.5rem;
		overflow-x: auto;
	}
	.column {
		min-width: 260px;
		width: 300px;
		background: transparent;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.column-header {
		font-weight: 700;
		color: var(--light-100);
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
		border: 1px solid rgba(255,255,255,0.03);
	}
	.column-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.5rem 0.25rem;
		min-height: 100px;
	}
	.column.drop-zone {
		transition: all 0.2s;
	}
	.column.drop-zone:hover {
		background: rgba(33, 150, 243, 0.05);
		border-radius: 8px;
	}
	.draggable-item {
		cursor: move;
		transition: all 0.2s;
		position: relative;
	}
	.draggable-item:hover {
		opacity: 0.8;
	}
	.draggable-item.has-changes::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border: 2px solid var(--primary-500);
		border-radius: 8px;
		pointer-events: none;
		z-index: 1;
	}
	.draggable-item.has-changes::after {
		content: '●';
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		color: var(--primary-500);
		font-size: 1rem;
		z-index: 2;
	}
</style>

