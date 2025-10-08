<script lang="ts">
	import { onMount } from 'svelte';
	import Layer from './Layer.svelte';
	import ProjectSidebar from './ProjectSidebar.svelte';
	export let projectId: string;

	let items: any[] = [];
	let types: any[] = [];

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

	onMount(async () => {
		await loadTypes();
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

</script>

<div class="project-viewer-wrap">
	<div class="project-viewer">
		{#if tree.length === 0}
			<div style="padding:1rem">No items yet — create a project or add a root item</div>
		{:else}
			{#if rootNode}
				<Layer node={rootNode} projectId={projectId} types={types} on:created={() => loadItems()} />
			{/if}
		{/if}
	</div>
	<ProjectSidebar projectId={projectId} on:changed={() => loadItems()} />
</div>

<style>
	.project-viewer-wrap { display:flex; gap:1rem; align-items:flex-start; width:100%; }
	.project-viewer { display:flex; flex-wrap:wrap; gap:1rem; width:100%; }
</style>

