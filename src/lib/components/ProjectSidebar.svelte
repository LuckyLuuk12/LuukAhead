<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  export let projectId: string;
  const dispatch = createEventDispatcher();

  let types: any[] = [];
  let priorities: any[] = [];

  // Draft arrays used while reordering so we don't eagerly persist changes
  let draftTypes: any[] = [];
  let draftPriorities: any[] = [];
  let isReorderingTypes = false;
  let isReorderingPriorities = false;
  let dragSrcIndex: number | null = null;

  let newTypeName = '';
  let newPriorityName = '';

  async function load() {
    if (!projectId) return;
    const [tRes, pRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/item-types`),
      fetch(`/api/projects/${projectId}/priorities`)
    ]);
    if (tRes.ok) types = await tRes.json();
    if (pRes.ok) priorities = await pRes.json();

    // initialize drafts to match saved order
    draftTypes = types.slice();
    draftPriorities = priorities.slice();
  }

  onMount(load);

  async function createType() {
    if (!newTypeName) return;
    const res = await fetch(`/api/projects/${projectId}/item-types`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newTypeName })
    });
    if (res.ok) { newTypeName = ''; await load(); dispatch('changed'); }
  }

  async function updateTypeColor(id: string, color: string) {
    const res = await fetch(`/api/projects/${projectId}/item-types/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color })
    });
    if (res.ok) await load();
  }

  async function createPriority() {
    if (!newPriorityName) return;
    const res = await fetch(`/api/projects/${projectId}/priorities`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newPriorityName })
    });
    if (res.ok) { newPriorityName = ''; await load(); dispatch('changed'); }
  }

  async function updatePriorityColor(id: string, color: string) {
    const res = await fetch(`/api/projects/${projectId}/priorities/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color })
    });
    if (res.ok) await load();
  }

  // compute an HSL color moving from purple (~270deg) to red (0deg) across count steps
  function hueForIndex(idx: number, count: number) {
    if (count <= 1) return 270; // purple if single
    const start = 270; // purple
    const end = 0; // red
    // interpolate hue along shortest path via decreasing hue (270 -> 0)
    const t = idx / Math.max(1, count - 1);
    return Math.round(start + (end - start) * t);
  }

  function toHslString(h: number, s = 70, l = 50) {
    return `hsl(${h} ${s}% ${l}%)`;
  }

  function computeTypeColor(idx: number, count: number) {
    return toHslString(hueForIndex(idx, count));
  }

  function computePriorityColor(idx: number, count: number) {
    // reverse mapping: index 0 should be red (most important) and last purple
    const revIdx = Math.max(0, (count - 1) - idx);
    return toHslString(hueForIndex(revIdx, count));
  }

  async function deleteType(id: string) {
    if (!confirm('Delete this type?')) return;
    const res = await fetch(`/api/projects/${projectId}/item-types/${id}`, { method: 'DELETE' });
    if (res.ok) { await load(); dispatch('changed'); }
  }

  async function deletePriority(id: string) {
    if (!confirm('Delete this priority?')) return;
    const res = await fetch(`/api/projects/${projectId}/priorities/${id}`, { method: 'DELETE' });
    if (res.ok) { await load(); dispatch('changed'); }
  }

  // --- Drag & drop reorder helpers ---
  function onDragStart(e: DragEvent, index: number) {
    dragSrcIndex = index;
    // set plain data to allow dragging in some browsers (not used on drop)
    try { e.dataTransfer?.setData('text/plain', String(index)); e.dataTransfer!.effectAllowed = 'move'; } catch {}
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    // allow drop
    e.dataTransfer!.dropEffect = 'move';
  }

  function onDropTypes(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragSrcIndex === null) return;
    const src = dragSrcIndex;
    const dst = targetIndex;
    if (src === dst) return;
    const item = draftTypes.splice(src, 1)[0];
    draftTypes.splice(dst, 0, item);
    // reset src to avoid accidental reuse
    dragSrcIndex = null;
    isReorderingTypes = true;
    // reassign to trigger Svelte reactivity after mutating the array
    draftTypes = draftTypes.slice();
  }

  function onDropPriorities(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragSrcIndex === null) return;
    const src = dragSrcIndex;
    const dst = targetIndex;
    if (src === dst) return;
    const item = draftPriorities.splice(src, 1)[0];
    draftPriorities.splice(dst, 0, item);
    dragSrcIndex = null;
    isReorderingPriorities = true;
    // reassign to trigger Svelte reactivity after mutating the array
    draftPriorities = draftPriorities.slice();
  }

  function cancelReorderTypes() {
    draftTypes = types.slice();
    isReorderingTypes = false;
  }

  function cancelReorderPriorities() {
    draftPriorities = priorities.slice();
    isReorderingPriorities = false;
  }

  // Try to send a bulk reorder endpoint first, fall back to per-item PATCH if not available.
  async function confirmReorderTypes() {
    if (!projectId) return;
    const order = draftTypes.map((t) => t.id);
    // attempt bulk endpoint
    let res = await fetch(`/api/projects/${projectId}/item-types/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order })
    });
    if (res.ok) {
      types = draftTypes.slice();
      isReorderingTypes = false;
      dispatch('changed');
      return;
    }

    // fallback: try to PATCH each item with a position field
    let ok = true;
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      const r = await fetch(`/api/projects/${projectId}/item-types/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: i })
      });
      if (!r.ok) { ok = false; break; }
    }
    if (ok) {
      types = draftTypes.slice();
      isReorderingTypes = false;
      dispatch('changed');
    } else {
      alert('Failed to persist new type order. Your changes are still local; cancel or try again.');
    }
  }

  async function confirmReorderPriorities() {
    if (!projectId) return;
    const order = draftPriorities.map((p) => p.id);
    let res = await fetch(`/api/projects/${projectId}/priorities/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order })
    });
    if (res.ok) {
      priorities = draftPriorities.slice();
      isReorderingPriorities = false;
      dispatch('changed');
      return;
    }

    // fallback to per-item PATCH
    let ok = true;
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      const r = await fetch(`/api/projects/${projectId}/priorities/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: i })
      });
      if (!r.ok) { ok = false; break; }
    }
    if (ok) {
      priorities = draftPriorities.slice();
      isReorderingPriorities = false;
      dispatch('changed');
    } else {
      alert('Failed to persist new priority order. Your changes are still local; cancel or try again.');
    }
  }
</script>

<aside class="sidebar">
  <div class="sidebar-section">
    <h4>Item Types</h4>
    {#if !isReorderingTypes}
      <ul class="item-list">
        {#each types as t, idx}
          <li class="item">
            <div class="item-color" style="background: {t.color ?? computeTypeColor(idx, types.length)}"></div>
            <div class="item-name">{t.name}</div>
            <input type="color" value={t.color ?? computeTypeColor(idx, types.length)} on:input={(e) => updateTypeColor(t.id, (e.target as HTMLInputElement).value)} title="Pick color" class="color-picker" />
            <button on:click={() => deleteType(t.id)} title="Delete type" class="btn-delete">🗑️</button>
          </li>
        {/each}
      </ul>
      <button on:click={() => { draftTypes = types.slice(); isReorderingTypes = true; }} class="btn-secondary">Reorder</button>
    {:else}
      <p class="reorder-hint">Drag to reorder, then Confirm or Cancel</p>
      <ul class="item-list reorderable">
        {#each draftTypes as t, i}
          <li class="item draggable" draggable="true" on:dragstart={(e) => onDragStart(e, i)} on:dragover={onDragOver} on:drop={(e) => onDropTypes(e, i)}>
            <span class="drag-handle">⋮⋮</span>
            <span class="item-name">{t.name}</span>
            <span class="order-badge">#{i+1}</span>
          </li>
        {/each}
      </ul>
      <div class="button-group">
        <button on:click={confirmReorderTypes} class="btn-primary">Confirm</button>
        <button on:click={cancelReorderTypes} class="btn-secondary">Cancel</button>
      </div>
    {/if}
    <div class="input-group">
      <input bind:value={newTypeName} placeholder="New type name" class="input-field" />
      <button on:click={createType} class="btn-add">+</button>
    </div>
  </div>

  <div class="sidebar-section">
    <h4>Priorities</h4>
    {#if !isReorderingPriorities}
      <ul class="item-list">
        {#each priorities as pr, idx}
          <li class="item">
            <div class="item-color" style="background: {pr.color ?? computePriorityColor(idx, priorities.length)}"></div>
            <div class="item-name">{pr.name}</div>
            <input type="color" value={pr.color ?? computePriorityColor(idx, priorities.length)} on:input={(e) => updatePriorityColor(pr.id, (e.target as HTMLInputElement).value)} title="Pick color" class="color-picker" />
            <button on:click={() => deletePriority(pr.id)} title="Delete priority" class="btn-delete">🗑️</button>
          </li>
        {/each}
      </ul>
      <button on:click={() => { draftPriorities = priorities.slice(); isReorderingPriorities = true; }} class="btn-secondary">Reorder</button>
    {:else}
      <p class="reorder-hint">Drag to reorder, then Confirm or Cancel</p>
      <ul class="item-list reorderable">
        {#each draftPriorities as p, i}
          <li class="item draggable" draggable="true" on:dragstart={(e) => onDragStart(e, i)} on:dragover={onDragOver} on:drop={(e) => onDropPriorities(e, i)}>
            <span class="drag-handle">⋮⋮</span>
            <span class="item-name">{p.name}</span>
            <span class="order-badge">#{i+1}</span>
          </li>
        {/each}
      </ul>
      <div class="button-group">
        <button on:click={confirmReorderPriorities} class="btn-primary">Confirm</button>
        <button on:click={cancelReorderPriorities} class="btn-secondary">Cancel</button>
      </div>
    {/if}
    <div class="input-group">
      <input bind:value={newPriorityName} placeholder="New priority name" class="input-field" />
      <button on:click={createPriority} class="btn-add">+</button>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    width: 300px;
    background: var(--card);
    border-radius: 8px;
    padding: 1rem;
    overflow-y: auto;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .sidebar h4 {
    margin: 0;
    color: var(--primary-400);
    font-size: 1rem;
    font-weight: 600;
  }
  .item-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--container);
    border: 1px solid var(--dark-700);
    border-radius: 4px;
    transition: all 0.2s;
  }
  .item:hover {
    border-color: var(--primary-600);
  }
  .item-color {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .item-name {
    flex: 1;
    color: var(--light-200);
    font-size: 0.9rem;
  }
  .color-picker {
    width: 32px;
    height: 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .btn-delete {
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
    padding: 0.25rem;
  }
  .btn-delete:hover {
    opacity: 1;
  }
  .btn-primary {
    padding: 0.5rem 1rem;
    background: var(--primary-500);
    color: var(--light-50);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }
  .btn-primary:hover {
    background: var(--primary-600);
  }
  .btn-secondary {
    padding: 0.5rem 1rem;
    background: var(--dark-700);
    color: var(--light-200);
    border: 1px solid var(--dark-600);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-secondary:hover {
    background: var(--dark-600);
  }
  .input-group {
    display: flex;
    gap: 0.5rem;
  }
  .input-field {
    flex: 1;
    padding: 0.5rem;
    background: var(--container);
    border: 1px solid var(--dark-700);
    border-radius: 4px;
    color: var(--light-100);
    font-size: 0.9rem;
  }
  .btn-add {
    padding: 0.5rem 1rem;
    background: var(--primary-500);
    color: var(--light-50);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1.1rem;
    transition: background 0.2s;
  }
  .btn-add:hover {
    background: var(--primary-600);
  }
  .reorder-hint {
    font-size: 0.85rem;
    color: var(--light-400);
    font-style: italic;
    margin: 0;
  }
  .draggable {
    cursor: move;
  }
  .drag-handle {
    color: var(--light-500);
    font-size: 1rem;
  }
  .order-badge {
    font-size: 0.8rem;
    color: var(--light-500);
  }
  .button-group {
    display: flex;
    gap: 0.5rem;
  }
</style>
