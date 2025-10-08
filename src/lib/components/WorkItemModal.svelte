<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  export let open: boolean = false;
  export let item: any = null; // work item object
  export let projectId: string;
  const dispatch = createEventDispatcher();

  let dlg: HTMLDialogElement | null = null;
  let title = '';
  let description = '';
  let remarks = '';
  let completed = 0;
  let completedBool = false;
  let priority_id: string | null = null;
  let deadlineStr = '';
  let priorities: any[] = [];
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
    completed = item.completed ?? 0;
    completedBool = !!completed;
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
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/priorities`);
      if (res.ok) priorities = await res.json();
    } catch (e) {
      // ignore
    }
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
      completed: completedBool ? 1 : 0
    };
    if (deadlineStr) body.deadline = Math.floor(new Date(deadlineStr).getTime() / 1000);

    const res = await fetch(`/api/projects/${projectId}/work-items/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (res.ok) {
      dispatch('saved');
      open = false;
      // reflect persisted value locally
      completed = completedBool ? 1 : 0;
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
</script>

<dialog bind:this={dlg} class="workitem-dialog" on:close={onClose} on:click={onDialogClick}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <form method="dialog" class="modal-form" on:click|stopPropagation>
    <div class="view-header">
      <h3>{title}</h3>
      <div style="display:flex; gap:0.5rem">
        <button type="button" on:click={() => { editMode = !editMode; }}>✏️</button>
        <button type="button" on:click={() => { open = false; }}>✖</button>
      </div>
    </div>

    {#if !editMode}
      <div class="meta-row">
        <div>Priority: <strong>{#if priority_id}{(priorities.find(p=>p.id===priority_id)?.name) ?? '(none)'}{:else}(none){/if}</strong></div>
        <div style="margin-left:1rem">Done: <input type="checkbox" bind:checked={completedBool} disabled /></div>
      </div>
  <div class="desc">{@html renderedDescription}</div>
      {#if remarks}
  <div class="remarks"><strong>Remarks</strong><div>{@html renderedRemarks}</div></div>
      {/if}
      <div class="actions">
        <button type="button" on:click={() => { editMode = true; }}>Edit</button>
      </div>
    {:else}
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

      <label>Done
        <input type="checkbox" bind:checked={completedBool} />
      </label>

      <div class="actions">
        <button type="button" on:click={save}>Save</button>
        <button type="button" on:click={() => { editMode = false; }}>Cancel</button>
      </div>
    {/if}
  </form>
</dialog>

<style>
  .workitem-dialog::backdrop { background: rgba(0,0,0,0.5); }
  .workitem-dialog { position: fixed; z-index: 10000; padding: 0; border: none; top: 50%; transform: translateY(-50%); right: 0; left: unset; height: 100vh; background: var(--container); border-radius:var(--border-radius) }
  .modal-form { width: 50vw; max-width: calc(100vw - 2rem); padding: 1rem; display:flex; flex-direction:column; gap:0.5rem; background:var(--card); height: 100%; }
  label { display:flex; flex-direction:column; font-size:0.9rem; }
  input[type="text"], textarea, select, input[type="datetime-local"] { width:100%; padding:0.4rem; border-radius:4px }
  .actions { display:flex; gap:0.5rem; justify-content:flex-end; margin-top:0.5rem }
  /* markdown content styles */
  .desc, .remarks div { font-size:0.95rem; line-height:1.5 }
</style>
