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
	let expandedNodes = new Set<string>(); // track which nodes are expanded
	let previousViewMode: 'tree' | 'pyramid' | 'columns' = viewMode;

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
		// Initialize with root expanded in pyramid mode
		if (viewMode === 'pyramid' && rootNode) {
			expandedNodes.add(rootNode.id);
		}
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

// Columns view: group items by their type index (depth -> type)
$: columns = (() => {
	// produce an array of columns: one per type, plus a backlog column for items without type
	const cols: any[] = [];
	if (!items || items.length === 0) return cols;

	// Build a depth map from the already-computed `tree` structure
	// `tree` nodes were assigned `.depth` in the reactive block above. We need to map item.id -> depth
	const depthMap = new Map<string, number>();
	function walk(node: any) {
		depthMap.set(node.id, node.depth ?? 0);
		if (node.children) node.children.forEach((c: any) => walk(c));
	}
	tree.forEach((r) => walk(r));

	const typeCount = Math.max(0, types?.length || 0);
	for (let i = 0; i < typeCount; i++) cols.push([]);
	const backlog: any[] = [];

	// Assign items into columns using the depth from depthMap. Also attach `depth` to the item clones
	// EXCLUDE root items (is_root=true) from columns view
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


	return cols;
})();

</script>

<div class="project-viewer-wrap">
	<div class="top-section">
		<div class="viewer-header">
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
					<!-- Columns view: one column per type (like GitHub Projects) -->
					<div class="columns-view">
						{#each columns as col, idx}
							<div class="column" data-index={idx}>
								<div class="column-header">{types?.[idx]?.name ?? (idx === columns.length -1 && types?.length ? 'Backlog' : `Column ${idx+1}`)}</div>
								<div class="column-body">
									{#each col as node}
										<Layer node={node} {projectId} {types} {priorities} viewMode={'columns'} expandedNodes={expandedNodes} standalone={true} on:created={() => loadItems()} />
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
		justify-content: flex-end;
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
	}
</style>

