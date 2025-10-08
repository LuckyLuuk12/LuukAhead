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

<aside class="sidebar container">
  <h4>Types</h4>
  {#if !isReorderingTypes}
    <ul>
      {#each types as t, idx}
        <li style="display:flex; gap:0.5rem; align-items:center">
          <div style="flex:1">{t.name}</div>
          <input type="color" value={t.color ?? computeTypeColor(idx, types.length)} on:input={(e) => updateTypeColor(t.id, (e.target as HTMLInputElement).value)} title="Pick color" />
          <button on:click={() => deleteType(t.id)} title="Delete type">🗑️</button>
        </li>
      {/each}
    </ul>
    <div style="margin-top:0.5rem">
      <button on:click={() => { draftTypes = types.slice(); isReorderingTypes = true; }}>Reorder types</button>
    </div>
  {:else}
    <p><em>Drag to reorder types, then Confirm or Cancel</em></p>
    <ul>
      {#each draftTypes as t, i}
        <li draggable="true" on:dragstart={(e) => onDragStart(e, i)} on:dragover={onDragOver} on:drop={(e) => onDropTypes(e, i)}>
          <span style="flex:1">{t.name}</span>
          <span style="opacity:0.6; font-size:0.9em">#{i+1}</span>
        </li>
      {/each}
    </ul>
    <div style="margin-top:0.5rem">
      <button on:click={confirmReorderTypes}>Confirm</button>
      <button on:click={cancelReorderTypes} style="margin-left:0.5rem">Cancel</button>
    </div>
  {/if}
  <div>
    <input bind:value={newTypeName} placeholder="New type name" />
    <button on:click={createType}>Add type</button>
  </div>

  <h4>Priorities</h4>
  {#if !isReorderingPriorities}
    <ul>
      {#each priorities as pr, idx}
        <li style="display:flex; gap:0.5rem; align-items:center">
          <div style="flex:1">{pr.name}</div>
          <input type="color" value={pr.color ?? computePriorityColor(idx, priorities.length)} on:input={(e) => updatePriorityColor(pr.id, (e.target as HTMLInputElement).value)} title="Pick color" />
          <button on:click={() => deletePriority(pr.id)} title="Delete priority">🗑️</button>
        </li>
      {/each}
    </ul>
    <div style="margin-top:0.5rem">
      <button on:click={() => { draftPriorities = priorities.slice(); isReorderingPriorities = true; }}>Reorder priorities</button>
    </div>
  {:else}
    <p><em>Drag to reorder priorities, then Confirm or Cancel</em></p>
    <ul>
      {#each draftPriorities as p, i}
        <li draggable="true" on:dragstart={(e) => onDragStart(e, i)} on:dragover={onDragOver} on:drop={(e) => onDropPriorities(e, i)}>
          <span style="flex:1">{p.name}</span>
          <span style="opacity:0.6; font-size:0.9em">#{i+1}</span>
        </li>
      {/each}
    </ul>
    <div style="margin-top:0.5rem">
      <button on:click={confirmReorderPriorities}>Confirm</button>
      <button on:click={cancelReorderPriorities} style="margin-left:0.5rem">Cancel</button>
    </div>
  {/if}
  <div>
    <input bind:value={newPriorityName} placeholder="New priority name" />
    <button on:click={createPriority}>Add priority</button>
  </div>
</aside>

<style>
  .sidebar { width:260px; padding:1rem; position:absolute; right: 0; }
  .sidebar ul { list-style:none; padding:0; margin:0 0 0.5rem 0 }
  .sidebar li { display:flex; justify-content:space-between; align-items:center; padding:0.25rem 0 }
  .sidebar input { width:100%; margin-top:0.5rem }
</style>
