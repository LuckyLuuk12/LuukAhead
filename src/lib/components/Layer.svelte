<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import WorkItemModal from './WorkItemModal.svelte';
	export let node: any;
	export let projectId: string;
	export let types: any[] = [];
	export let priorities: any[] = [];
	export let viewMode: 'tree' | 'pyramid' | 'columns' = 'tree';
	export let expandedNodes: Set<string> = new Set();
	export let standalone: boolean = false; // In pyramid mode, don't render children
	export let epicInfo: { title: string; number: number; color: string } | null = null; // Epic tag info
	
	const dispatch = createEventDispatcher();
	let modalOpen = false;
	let modalItem: any = null;

	// In tree mode, show children only if expanded. In pyramid standalone mode, never show them (parent handles it)
	$: showChildren = !standalone && expandedNodes.has(node.id);
	
	// Show expand button if node has children
	$: hasChildren = node.children && node.children.length > 0;
	$: isExpanded = expandedNodes.has(node.id);

	function toggleExpandCollapse(e: MouseEvent) {
		e.stopPropagation();
		dispatch('toggle', node.id);
	}

function clickFromInteractive(el: EventTarget | null) {
	try {
		const tgt = el as HTMLElement | null;
		if (!tgt) return false;
		return !!tgt.closest && !!tgt.closest('button, a, input, textarea, select, label');
	} catch (e) {
		return false;
	}
}

function openModalOnCardClick(e: MouseEvent) {
	if (clickFromInteractive(e.target)) return;
	modalItem = node;
	modalOpen = true;
}

function openModalOnKeypress(e: KeyboardEvent) {
	if (e.key !== 'Enter') return;
	if (clickFromInteractive(e.target)) return;
	modalItem = node;
	modalOpen = true;
}

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

	async function deleteNode(e: MouseEvent) {
		if (!e.shiftKey && !confirm('Remove this item and its children?')) return;
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
		// Show the type of this node, not its children
		// depth 0 = project root (no type shown), depth 1 = first type, etc.
		if (depth === 0) return 'Project Root';
		// Use the node's actual type_id to find the type name, not depth-based indexing
		if (node.type_id) {
			const t = types.find(t => t.id === node.type_id);
			if (t) return t.name;
		}
		// fallback to depth-based if no type_id
		const typeIdx = depth - 1;
		if (typeIdx >= 0 && typeIdx < types.length) {
			return types[typeIdx]?.name ?? `Type ${depth}`;
		}
		return null;
	}

	// Color computation functions for tags
	function hueForIndexTag(index: number, total: number): number {
		if (total <= 1) return 270;
		return 270 - (index / (total - 1)) * 270;
	}

	function toHslStringTag(hue: number, saturation: number, lightness: number): string {
		return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
	}

	function computeTypeColor(typeId: string | null): string {
		if (!typeId || !types) return toHslStringTag(270, 70, 60);
		const type = types.find(t => t.id === typeId);
		if (type?.color) return type.color;
		const index = types.findIndex(t => t.id === typeId);
		if (index === -1) return toHslStringTag(270, 70, 60);
		const hue = hueForIndexTag(index, types.length);
		return toHslStringTag(hue, 70, 60);
	}

	function computePriorityColor(priorityId: string | null): string {
		if (!priorityId || !priorities) return toHslStringTag(270, 70, 60);
		const priority = priorities.find(p => p.id === priorityId);
		if (priority?.color) return priority.color;
		const index = priorities.findIndex(p => p.id === priorityId);
		if (index === -1) return toHslStringTag(270, 70, 60);
		// Reverse gradient for priority (high priority = red, low = purple)
		const reverseIndex = priorities.length - 1 - index;
		const hue = hueForIndexTag(reverseIndex, priorities.length);
		return toHslStringTag(hue, 70, 60);
	}

	function getStatusColor(status: string): string {
		const statusColors: Record<string, string> = {
			todo: 'hsl(210, 20%, 50%)',
			in_progress: 'hsl(270, 70%, 60%)',
			review: 'hsl(330, 70%, 60%)',
			done: 'hsl(180, 70%, 50%)',
			cancelled: 'hsl(0, 0%, 40%)'
		};
		return statusColors[status] || statusColors.todo;
	}

	// Get type, priority, and status info for tags
	$: typeInfo = node.type_id ? types.find(t => t.id === node.type_id) : null;
	$: priorityInfo = node.priority_id ? priorities.find(p => p.id === node.priority_id) : null;
	$: statusLabel = node.status ? node.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Todo';

	// derived names for markup
	$: nextName = (types?.[node.depth]?.name ?? 'layer');
	$: myName = (types?.[node.depth - 1]?.name ?? 'item');
</script>

<div class="layer-container" class:tree-mode={!standalone}>
	<div class="layer layer-depth-{node.depth}">
		<div class="card" style="--layer-color: {colorForDepth(node.depth)}; border-left-color: var(--layer-color)" on:click|stopPropagation={openModalOnCardClick} on:keypress|stopPropagation={openModalOnKeypress} tabindex="0" role="button" aria-label="Open item">
			<div class="card-header">
				<div class="card-info">
					<h3 class="card-title">{node.title}</h3>
				</div>
				<div class="card-actions">
					{#if hasChildren}
						{#if standalone || !node.is_root}
							<button class="btn-icon btn-expand" aria-label="Toggle expand" on:click|stopPropagation={toggleExpandCollapse} title={isExpanded ? 'Collapse' : 'Expand'}>
								{isExpanded ? '▼' : '▶'}
							</button>
						{/if}
					{/if}
					{#if types && types.length > node.depth}
						<button class="btn-icon" aria-label="Add nested layer" on:click|stopPropagation={addChild} title={`Add ${nextName}`}>
							＋
						</button>
					{/if}
					<button class="btn-icon btn-danger" aria-label="Delete" on:click|stopPropagation={deleteNode} title="Delete (Shift+Click to skip confirmation)">🗑️</button>
				</div>
			</div>

			<!-- Bottom tags for type, priority, and status -->
			{#if !node.is_root}
				<div class="card-tags">
					{#if epicInfo}
						<div class="item-tag epic-tag" style="color: {epicInfo.color};" title="Epic: {epicInfo.title}">
							#{epicInfo.number} {epicInfo.title}
						</div>
					{/if}
					{#if typeInfo}
						<div class="item-tag type-tag" style="color: {computeTypeColor(node.type_id)};" title="Type: {typeInfo.name}">
							{typeInfo.name}
						</div>
					{/if}
					{#if priorityInfo}
						<div class="item-tag priority-tag" style="color: {computePriorityColor(node.priority_id)};" title="Priority: {priorityInfo.name}">
							⚡ {priorityInfo.name}
						</div>
					{/if}
					<div class="item-tag status-tag" style="color: {getStatusColor(node.status || 'todo')};" title="Status: {statusLabel}">
						{statusLabel}
					</div>
				</div>
			{/if}

			{#if showChildren && node.children?.length}
				<div class="children-container">
					{#each node.children as child}
						<svelte:self node={child} {projectId} {types} {priorities} epicInfo={null} {viewMode} {expandedNodes} {standalone} on:created on:toggle />
					{/each}
				</div>
			{/if}
		</div>
	</div>
	
	<WorkItemModal bind:open={modalOpen} item={modalItem} {projectId} {types} {priorities} on:saved={() => { dispatch('created'); modalOpen = false; }} />
</div>

<style>
	.layer-container {
		width: 100%;
		max-width: 450px;
		flex-shrink: 0;
	}
	.layer-container.tree-mode {
		max-width: none;
	}
	.layer {
		width: 100%;
	}
	.card {
		background: var(--container);
		border: 1px solid var(--dark-700);
		border-left: 4px solid var(--primary-500);
		border-radius: 8px;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}
	.card:hover {
		box-shadow: 0 4px 12px rgba(0,0,0,0.2);
		transform: translateY(-2px);
		border-color: var(--layer-color);
	}
	.layer-depth-0 .card {
		background: var(--card);
		border-left-width: 6px;
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}
	.card-info {
		flex: 1;
		min-width: 0;
	}
	.card-title {
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
		color: var(--light-100);
		font-weight: 600;
	}
	.card-desc {
		margin: 0 0 0.5rem 0;
		color: var(--light-300);
		font-size: 0.9rem;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.card-tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--dark-700);
	}
	.item-tag {
		font-size: 0.7rem;
		font-weight: 600;
		background: rgba(0, 0, 0, 0.6);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		text-transform: uppercase;
		letter-spacing: 0.02em;
		max-width: 120px;
	}
	.badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}
	.card-actions {
		display: flex;
		gap: 0.25rem;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.btn-icon {
		padding: 0.35rem 0.65rem;
		background: var(--dark-700);
		color: var(--light-200);
		border: 1px solid var(--dark-600);
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
		white-space: nowrap;
	}
	.btn-icon:hover {
		background: var(--dark-600);
		color: var(--light-50);
	}
	.btn-primary {
		background: var(--primary-700);
		border-color: var(--primary-600);
	}
	.btn-primary:hover {
		background: var(--primary-600);
	}
	.btn-expand {
		background: var(--dark-600);
		border-color: var(--dark-500);
		min-width: 2rem;
		font-size: 0.75rem;
	}
	.btn-expand:hover {
		background: var(--dark-500);
	}
	.btn-danger:hover {
		background: var(--red-700);
		border-color: var(--red-600);
	}
	.children-container {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--dark-700);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>
