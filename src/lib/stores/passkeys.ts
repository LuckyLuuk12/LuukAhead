import { writable } from 'svelte/store';

// Client-only store that keeps a Map of projectId -> passkey in memory
// Passkeys are never sent to the server; this store is only for client-side encryption usage.
// We persist to sessionStorage so navigating between routes doesn't lose the passkeys
// during normal client-side navigation. They will still be cleared explicitly by
// calling clearPasskey (per-project) or clearAllPasskeys (e.g. on logout).
const STORAGE_KEY = 'luukahead:projectPasskeys';

function loadFromSession(): Map<string, string> {
  try {
    if (typeof sessionStorage === 'undefined') return new Map();
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as Array<[string, string]>;
    return new Map(arr);
  } catch (e) {
    console.warn('Failed to load passkeys from sessionStorage', e);
    return new Map();
  }
}

function saveToSession(m: Map<string, string>) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const arr = Array.from(m.entries());
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn('Failed to save passkeys to sessionStorage', e);
  }
}

export const projectPasskeys = writable<Map<string, string>>(loadFromSession());

// keep sessionStorage in sync whenever the store changes
projectPasskeys.subscribe((m) => saveToSession(m));

export function setPasskey(projectId: string, passkey: string) {
  projectPasskeys.update((m) => {
    const nm = new Map(m);
    nm.set(projectId, passkey);
    saveToSession(nm);
    return nm;
  });
}

export function clearPasskey(projectId: string) {
  projectPasskeys.update((m) => {
    const nm = new Map(m);
    nm.delete(projectId);
    saveToSession(nm);
    return nm;
  });
}

export function clearAllPasskeys() {
  projectPasskeys.set(new Map());
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to remove passkeys from sessionStorage', e);
  }
}

export function getPasskeySync(projectId: string): string {
  let value = '';
  // synchronous read from the store by subscribing and immediately unsubscribing
  projectPasskeys.subscribe((m) => {
    value = m.get(projectId) || '';
  })();
  return value;
}
