// Minimal IndexedDB helpers for persisting FileSystem handles
export async function idbOpen(dbName = 'fishpie', version = 1): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet<T = unknown>(key: string, value: T) {
  const db = await idbOpen();
  const payload = value instanceof Blob ? value : await (async () => {
    try { return JSON.stringify(value); } catch { return String(value); }
  })();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(payload, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  const db = await idbOpen();
  const raw: unknown = await new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (raw == null) return undefined;
  if (raw instanceof Blob) return raw as T;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T; } catch { return raw as T; }
  }
  return raw as T;
}

export async function idbDel(key: string) {
  const db = await idbOpen();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
