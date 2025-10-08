<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Layer from './Layer.svelte';
	export let node: any;
	export let projectId: string;
	export let types: any[] = [];
	const dispatch = createEventDispatcher();

	function hueForIndex(idx: number, count: number) {
		if (count <= 1) return 270;
		const start = 270;
		const end = 0;
		const t = idx / Math.max(1, count - 1);
		return Math.round(start + (end - start) * t);
	}

	function toHslString(h: number, s = 70, l = 50) {
		return `hsl(${h} ${s}% ${l}%)`;
	}

	function colorForDepth(depth: number) {
		// node depth: 0 = project root (no type), 1 = first type, etc.
		const typeIdx = Math.max(0, depth - 1);
		// root should have a neutral border
		if (depth === 0) return 'var(--dark-700, #fff)';
		const t = types?.[typeIdx];
		if (t?.color) return t.color;
		const count = Math.max(1, types?.length || 1);
		return toHslString(hueForIndex(typeIdx, count));
	}

// Add a sibling item (same type) under the same parent as this node
	async function addSibling() {
		// root has no siblings
		if (node.is_root) return;
	const myType = types?.[node.depth - 1];
	const res = await fetch(`/api/projects/${projectId}/work-items`, {
		method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: node.parent_id ?? null, title: 'New item', type_id: myType?.id ?? null })
	});
		if (res.ok) dispatch('created'); else console.error('Failed to create sibling', await res.text());
	}

	// Add a nested child of the next type (the type index equals node.depth)
	async function addChild() {
		const nextType = types?.[node.depth];
		const res = await fetch(`/api/projects/${projectId}/work-items`, {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: node.id, title: 'New item', type_id: nextType?.id ?? null })
		});
		if (res.ok) dispatch('created'); else console.error('Failed to create child', await res.text());
	}

	async function deleteNode() {
		if (!confirm('Remove this item and its children?')) return;
		const res = await fetch(`/api/projects/${projectId}/work-items/${node.id}`, { method: 'DELETE' });
		if (res.ok) dispatch('created'); else console.error('Failed delete', await res.text());
	}

	async function addFirstLayer() {
		// only for root: create a child with the first type if available
		const firstType = types?.[0];
		const res = await fetch(`/api/projects/${projectId}/work-items`, {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: node.id, title: 'Layer', type_id: firstType?.id ?? null })
		});
		if (res.ok) dispatch('created'); else console.error('Failed to create first layer', await res.text());
	}

	async function addNestedLayer() {
		// add a nested layer inside this node of the next type in order (depth+1)
		const nextType = types?.[node.depth + 1];
		if (!nextType) return;
		const res = await fetch(`/api/projects/${projectId}/work-items`, {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: node.id, title: 'Layer', type_id: nextType.id })
		});
		if (res.ok) dispatch('created'); else console.error('Failed to create nested layer', await res.text());
	}

	function typeNameForDepth(depth: number) {
		// use types[depth] if available
		return (types?.[depth]?.name ?? `Type ${depth + 1}`) + '(s)';
	}

	// derived names for markup
	$: nextName = (types?.[node.depth]?.name ?? 'layer');
	$: myName = (types?.[node.depth - 1]?.name ?? 'item');
</script>

<div class="stack">
	<div class="layer layer-depth-{node.depth}">
		<div class="card" style="border-color: {colorForDepth(node.depth)}">
			<div style="display:flex; align-items:center; justify-content:space-between">
				<div>
					<h3>{node.title}</h3>
					<p>{node.description}</p>
					<div class="badge">{typeNameForDepth(node.depth)}</div>
				</div>
				<div style="display:flex; gap:0.5rem; align-items:center">
					{#if node.is_root}
						<button aria-label="Add first layer" on:click={addFirstLayer} title="Add first layer">＋</button>
					{:else}
						<!-- primary: add a nested child of next type if available -->
						{#if types && types.length > node.depth}
							<button aria-label="Add nested layer" on:click={addChild} title={`Add nested ${nextName}`}>
								＋ {nextName}
							</button>
						{/if}
						<!-- secondary: add a sibling (same type) -->
						<button aria-label="Add sibling" on:click={addSibling} title={`Add ${myName} sibling`}>
							＋ {myName}
						</button>
					{/if}
					<button aria-label="Delete" on:click={deleteNode} title="Delete">🗑️</button>
				</div>
			</div>

			{#if node.children?.length}
				<div style="padding:0.5rem; margin-top:0.5rem">
					{#each node.children as child}
						<Layer node={child} projectId={projectId} types={types} on:created={() => dispatch('created')} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.stack { display:flex; gap:0.5rem; width: 100%; }
	.layer { display:flex; gap:0.25rem; overflow-x:auto; padding:0.25rem; }
	.layer-depth-0 { width: 100%; padding: 0.5rem; }
	.card { min-width:100%; border:1px solid #ddd; padding:0.25rem }
	.badge { display:inline-block; padding:2px 6px; border-radius:4px; margin-top:6px }
</style>
