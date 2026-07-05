/**
 * IndexedDB persistence: app state (Anfragen incl. segments/evaluations,
 * Checklisten, Standards, Settings) plus the raw bytes of uploaded PDFs,
 * so user data and files survive page reloads.
 *
 * Uploaded documents get a `idb://<docId>` marker as pdfUrl when persisted;
 * on hydration the blob is loaded and a fresh object URL is created.
 */

import type { Anfrage, Checkliste, InternerStandard } from '../types';
import type { AppSettings } from '../store';

const DB_NAME = 'specmatrix';
const DB_VERSION = 1;
const STATE_STORE = 'state';
const FILE_STORE = 'files';
const STATE_KEY = 'app';

export interface PersistedState {
  anfragen: Anfrage[];
  checklisten: Checkliste[];
  standards: InternerStandard[];
  settings: AppSettings;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
        if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function savePdfBlob(docId: string, blob: Blob): Promise<IDBValidKey> {
  return tx(FILE_STORE, 'readwrite', (s) => s.put(blob, docId));
}

export function loadPdfBlob(docId: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>(FILE_STORE, 'readonly', (s) => s.get(docId));
}

export function deletePdfBlob(docId: string): Promise<undefined> {
  return tx(FILE_STORE, 'readwrite', (s) => s.delete(docId));
}

function listFileKeys(): Promise<IDBValidKey[]> {
  return tx<IDBValidKey[]>(FILE_STORE, 'readonly', (s) => s.getAllKeys());
}

/** Serialize state for storage: blob object URLs become idb:// markers. */
function serialize(state: PersistedState): PersistedState {
  return {
    ...state,
    anfragen: state.anfragen.map((a) => ({
      ...a,
      documents: a.documents.map((d) => ({
        ...d,
        pdfUrl: d.pdfUrl.startsWith('blob:') ? `idb://${d.id}` : d.pdfUrl,
      })),
    })),
  };
}

export async function persistState(state: PersistedState): Promise<void> {
  try {
    const plain = JSON.parse(JSON.stringify(serialize(state)));
    await tx(STATE_STORE, 'readwrite', (s) => s.put(plain, STATE_KEY));
    // sweep orphaned PDF blobs of removed documents
    const docIds = new Set(state.anfragen.flatMap((a) => a.documents.map((d) => d.id)));
    for (const key of await listFileKeys()) {
      if (!docIds.has(String(key))) await deletePdfBlob(String(key));
    }
  } catch (e) {
    console.error('persistState failed', e);
  }
}

/** Load persisted state and rebuild object URLs for stored PDF blobs. */
export async function loadPersistedState(): Promise<PersistedState | null> {
  try {
    const raw = await tx<PersistedState | undefined>(STATE_STORE, 'readonly', (s) => s.get(STATE_KEY));
    if (!raw) return null;
    for (const a of raw.anfragen) {
      for (const d of a.documents) {
        if (d.pdfUrl.startsWith('idb://')) {
          const blob = await loadPdfBlob(d.id);
          d.pdfUrl = blob ? URL.createObjectURL(blob) : '';
        }
      }
    }
    return raw;
  } catch (e) {
    console.error('loadPersistedState failed', e);
    return null;
  }
}

/** Wipe all persisted data (state + stored PDFs). */
export async function clearPersistence(): Promise<void> {
  await tx(STATE_STORE, 'readwrite', (s) => s.delete(STATE_KEY));
  for (const key of await listFileKeys()) await deletePdfBlob(String(key));
}

/** Subscribe to the store and persist (debounced) on every change. */
export function startPersistence(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => PersistedState,
): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(() => persistState(getSnapshot()), 500);
  });
}
