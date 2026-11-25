/**
 * Cache local persistente baseado em IndexedDB para reduzir drasticamente o Egress no Supabase.
 * - Suporta grandes volumes sem o limite de 5 MB do localStorage.
 * - TTL padrão de 6 horas, atualização write-through em mutações locais e sincronização manual.
 */

const DB_NAME = 'acquarela_fornecedores_cache_v1';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

export const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
export const FORCE_SYNC_EVENT = 'fornecedores-force-sync';

interface CacheEntry<T> {
  key: string;
  data: T;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

export async function getCachedData<T>(
  key: string,
  maxAgeMs: number = DEFAULT_CACHE_TTL_MS
): Promise<{ data: T; updatedAt: number; isFresh: boolean } | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) {
          resolve(null);
          return;
        }
        const age = Date.now() - entry.updatedAt;
        resolve({
          data: entry.data,
          updatedAt: entry.updatedAt,
          isFresh: age >= 0 && age < maxAgeMs,
        });
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry: CacheEntry<T> = {
        key,
        data,
        updatedAt: Date.now(),
      };
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // noop
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // noop
  }
}

export function triggerForceSync(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FORCE_SYNC_EVENT));
  }
}
