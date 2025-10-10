<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  export let open: boolean = false;
  export let item: any = null; // work item object
  export let projectId: string;
  export let priorities: any[] = [];
  export let types: any[] = [];
  const dispatch = createEventDispatcher();

  let dlg: HTMLDialogElement | null = null;
  let title = '';
  let description = '';
  let remarks = '';
  let status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled' = 'todo';
  let priority_id: string | null = null;
  let deadlineStr = '';
  let editMode = false;
  let renderedDescription = '';
  let renderedRemarks = '';

  // sync local form from incoming item
  $: if (item) {
    title = item.title ?? '';
    description = item.description ?? '';
    remarks = item.remarks ?? '';
    priority_id = item.priority_id ?? null;
    deadlineStr = item.deadline ? new Date(item.deadline * 1000).toISOString().slice(0,16) : '';
    status = item.status ?? 'todo';
    // entering view mode when item changes
    editMode = false;
  }

  // update rendered HTML when description/remarks change
  $: (async () => {
    if (!description) { renderedDescription = ''; return; }
    try { renderedDescription = await renderMarkdown(description); } catch (e) { renderedDescription = escapeHtml(description); }
  })();

  $: (async () => {
    if (!remarks) { renderedRemarks = ''; return; }
    try { renderedRemarks = await renderMarkdown(remarks); } catch (e) { renderedRemarks = escapeHtml(remarks); }
  })();

// small markdown renderer (very small subset: code, links, bold, italic, paragraphs)
let markedsanitizer: any = null;

async function ensureMarkdown() {
  if (markedsanitizer) return markedsanitizer;
  // dynamic import to avoid SSR issues
  const [{ marked }, DOMPurifyModule] = await Promise.all([import('marked'), import('dompurify')]);
  const DOMPurify = DOMPurifyModule.default || DOMPurifyModule;
  markedsanitizer = {
    render: async (md: string) => DOMPurify.sanitize(await marked(md, { gfm: true, breaks: true }))
  };
  return markedsanitizer;
}

async function renderMarkdown(md: string) {
  if (!md) return '';
  const m = await ensureMarkdown();
  return m.render(md);
}

function escapeHtml(str: string) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

  // show/close the native dialog when open changes
  $: if (dlg) {
    if (open && !dlg.open) {
      try { dlg.showModal(); } catch (e) { /* some browsers may throw if already open */ }
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }

  onMount(async () => {
    // pre-initialize markdown renderer in browser
    try { await ensureMarkdown(); } catch (e) { /* ignore */ }
  });

  async function save() {
    if (!projectId || !item) return;
    const body: any = {
      title: title || 'Untitled',
      description: description || null,
      remarks: remarks || null,
      priority_id: priority_id || null,
      status: status
    };
    if (deadlineStr) body.deadline = Math.floor(new Date(deadlineStr).getTime() / 1000);

    const res = await fetch(`/api/projects/${projectId}/work-items/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (res.ok) {
      dispatch('saved');
      open = false;
    } else {
      console.error('Failed to save item', await res.text());
    }
  }

  function onClose() {
    open = false;
  }

  function onDialogClick(e: MouseEvent) {
    // Close if clicking on the backdrop (the dialog element itself, not its content)
    if (e.target === dlg) {
      e.stopPropagation();
      open = false;
    }
  }

  // Color computation helpers (same as ProjectSidebar)
  function hueForIndex(idx: number, count: number) {
    if (count <= 1) return 270; // purple if single
    const start = 270; // purple
    const end = 0; // red
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

  // Status color mapping
  function getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      'todo': 'hsl(220 15% 40%)',           // Dark gray-blue
      'in_progress': 'hsl(250 60% 60%)',    // Purple
      'review': 'hsl(330 70% 60%)',         // Pink-magenta
      'done': 'hsl(190 90% 50%)',           // Cyan
      'cancelled': 'hsl(0 0% 35%)'          // Dark gray
    };
    return statusColors[status] || statusColors['todo'];
  }
</script>

<dialog bind:this={dlg} class="workitem-dialog" on:close={onClose} on:click={onDialogClick}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <form method="dialog" class="modal-form" on:click|stopPropagation>
    {#if !editMode}
      <div class="view-header">
        <div class="title-row">
          <h3>{title}</h3>
          <div class="badges">
            {#if item && item.type_id}
              {@const itemType = types.find(t => t.id === item.type_id)}
              {@const typeIndex = types.findIndex(t => t.id === item.type_id)}
              {#if itemType}
                <span class="badge badge-type" style="background-color: {itemType.color || computeTypeColor(typeIndex, types.length)}">
                  {itemType.name}
                </span>
              {/if}
            {/if}
            <span class="badge badge-status" style="background-color: {getStatusColor(status)}">
              {status.replace('_', ' ')}
            </span>
            {#if priority_id}
              {@const prio = priorities.find(p => p.id === priority_id)}
              {@const prioIndex = priorities.findIndex(p => p.id === priority_id)}
              {#if prio}
                <span class="badge badge-priority" style="background-color: {prio.color || computePriorityColor(prioIndex, priorities.length)}">
                  {prio.name}
                </span>
              {/if}
            {/if}
          </div>
        </div>
        <div style="display:flex; gap:0.5rem">
          <button type="button" on:click={() => { editMode = !editMode; }}>✏️</button>
          <button type="button" on:click={() => { open = false; }}>✖</button>
        </div>
      </div>
      <div class="desc">{@html renderedDescription}</div>
      {#if remarks}
  <div class="remarks"><strong>Remarks</strong><div>{@html renderedRemarks}</div></div>
      {/if}
      <div class="actions">
        <button type="button" on:click={() => { editMode = true; }}>Edit</button>
      </div>
    {:else}
      <div class="view-header">
        <h3>{title}</h3>
        <div style="display:flex; gap:0.5rem">
          <button type="button" on:click={() => { editMode = !editMode; }}>✏️</button>
          <button type="button" on:click={() => { open = false; }}>✖</button>
        </div>
      </div>
      <label>Title
        <input type="text" bind:value={title} />
      </label>

      <label>Description
        <textarea rows="4" bind:value={description}></textarea>
      </label>

      <label>Priority
        <select bind:value={priority_id}>
          <option value="">(none)</option>
          {#each priorities as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </label>

      <label>Remarks
        <textarea rows="2" bind:value={remarks}></textarea>
      </label>

      <label>Deadline
        <input type="datetime-local" bind:value={deadlineStr} />
      </label>

      <label>Status
        <select bind:value={status}>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>

      <div class="actions">
        <button type="button" on:click={save}>Save</button>
        <button type="button" on:click={() => { editMode = false; }}>Cancel</button>
      </div>
    {/if}
  </form>
</dialog>

<style>
  .workitem-dialog::backdrop { 
    background: rgba(0,0,0,0.7); 
  }
  
  .workitem-dialog { 
    position: fixed; 
    z-index: 10000; 
    padding: 0; 
    border: 1px solid var(--dark-700);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    top: 50%; 
    transform: translateY(-50%); 
    right: 0; 
    left: unset; 
    height: 100vh; 
    background: var(--container); 
    border-radius: var(--border-radius);
  }
  
  .modal-form { 
    width: 50vw; 
    max-width: calc(100vw - 2rem); 
    padding: 1.5rem; 
    display: flex; 
    flex-direction: column; 
    gap: 1rem; 
    background: var(--card); 
    height: 100%; 
    overflow-y: auto;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--primary-600);
    margin-bottom: 1rem;
  }

  .title-row {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .view-header h3 {
    margin: 0;
    color: var(--light-100);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: capitalize;
    color: var(--light-50);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .view-header button {
    background: var(--dark-700);
    border: 1px solid var(--dark-600);
    color: var(--light-200);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
  }

  .view-header button:hover {
    background: var(--dark-600);
    border-color: var(--primary-500);
    color: var(--light-100);
  }

  .desc {
    padding: 1.5rem;
    background: var(--dark-900);
    border-radius: 8px;
    border: 1px solid var(--dark-700);
    color: var(--light-200);
    font-size: 1rem;
    line-height: 1.6;
    min-height: 4rem;
  }

  .desc:empty::before {
    content: 'No description';
    color: var(--light-600);
    font-style: italic;
  }

  .remarks {
    margin-top: 1rem;
  }

  .remarks strong {
    display: block;
    color: var(--primary-400);
    font-size: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .remarks div {
    padding: 1rem;
    background: var(--dark-900);
    border-radius: 8px;
    border: 1px solid var(--dark-700);
    color: var(--light-200);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  /* Edit mode styles */
  label { 
    display: flex; 
    flex-direction: column; 
    font-size: 0.95rem;
    color: var(--light-300);
    font-weight: 500;
    gap: 0.5rem;
  }
  
  input[type="text"], 
  textarea, 
  select, 
  input[type="datetime-local"] { 
    width: 100%; 
    padding: 0.75rem;
    border-radius: 6px;
    background: var(--dark-800);
    border: 1px solid var(--dark-700);
    color: var(--light-100);
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  input[type="text"]:focus,
  textarea:focus,
  select:focus,
  input[type="datetime-local"]:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    background: var(--dark-700);
  }

  textarea {
    resize: vertical;
    font-family: inherit;
  }

  .actions { 
    display: flex; 
    gap: 0.75rem; 
    justify-content: flex-end; 
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--dark-700);
  }

  .actions button {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .actions button[type="button"]:first-child {
    background: var(--primary-600);
    color: var(--light-50);
  }

  .actions button[type="button"]:first-child:hover {
    background: var(--primary-500);
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
  }

  .actions button[type="button"]:last-child {
    background: var(--dark-700);
    color: var(--light-200);
    border: 1px solid var(--dark-600);
  }

  .actions button[type="button"]:last-child:hover {
    background: var(--dark-600);
    color: var(--light-100);
  }

  /* Markdown content styles */
  .desc :global(h1),
  .desc :global(h2),
  .desc :global(h3),
  .remarks div :global(h1),
  .remarks div :global(h2),
  .remarks div :global(h3) {
    color: var(--light-100);
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  .desc :global(p),
  .remarks div :global(p) {
    color: var(--light-200);
    margin-bottom: 0.75rem;
  }

  .desc :global(a),
  .remarks div :global(a) {
    color: var(--primary-400);
    text-decoration: none;
  }

  .desc :global(a:hover),
  .remarks div :global(a:hover) {
    color: var(--primary-300);
    text-decoration: underline;
  }

  .desc :global(code),
  .remarks div :global(code) {
    background: var(--dark-800);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    color: var(--primary-300);
    font-size: 0.9em;
  }

  .desc :global(pre),
  .remarks div :global(pre) {
    background: var(--dark-800);
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .desc :global(pre code),
  .remarks div :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .desc :global(ul),
  .desc :global(ol),
  .remarks div :global(ul),
  .remarks div :global(ol) {
    color: var(--light-200);
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .desc :global(li),
  .remarks div :global(li) {
    margin-bottom: 0.25rem;
  }

  .desc :global(blockquote),
  .remarks div :global(blockquote) {
    border-left: 3px solid var(--primary-600);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--light-300);
    font-style: italic;
  }
</style>
