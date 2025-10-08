<script lang="ts">
	import { onMount } from 'svelte';
	import Layer from './Layer.svelte';
	import ProjectSidebar from './ProjectSidebar.svelte';
	export let projectId: string;

	let items: any[] = [];
	let types: any[] = [];
	let viewMode: 'tree' | 'pyramid' = 'pyramid'; // default to pyramid view
	let expandedNodes = new Set<string>(); // track which nodes are expanded
	let previousViewMode: 'tree' | 'pyramid' = viewMode;

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

	function toggleExpand(nodeId: string) {
		if (expandedNodes.has(nodeId)) {
			expandedNodes.delete(nodeId);
		} else {
			expandedNodes.add(nodeId);
		}
		expandedNodes = expandedNodes; // trigger reactivity
	}

	onMount(async () => {
		await loadTypes();
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
			</div>
		</div>
	</div>
	<div class="bottom-section">
		<div class="project-viewer" class:pyramid-mode={viewMode === 'pyramid'}>
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
								{viewMode}
								{expandedNodes}
								standalone={true}
								on:created={() => loadItems()}
								on:toggle={(e) => toggleExpand(e.detail)}
							/>
						{/each}
					</div>
				{/each}
			{:else}
				<!-- Tree view: traditional nested -->
				{#if rootNode}
					<Layer 
						node={rootNode} 
						{projectId} 
						{types} 
						{viewMode}
						{expandedNodes}
						standalone={false}
						on:created={() => loadItems()}
						on:toggle={(e) => toggleExpand(e.detail)}
					/>
				{/if}
			{/if}
		</div>
		<ProjectSidebar projectId={projectId} on:changed={() => loadItems()} />
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
		padding: 0.5rem;
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
		padding: 0.5rem;
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
</style>

