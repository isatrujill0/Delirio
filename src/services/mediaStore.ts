import { ASSETS } from '../data/media';
import { uid } from './id';

/**
 * Photos, voice recordings and videos added on the device live in IndexedDB:
 * LocalStorage only holds ~5 MB of strings, far too little for media.
 */
const DB = 'nexo-media';
const STORE = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB no disponible'));
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = run(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

/** Stores a blob and returns its MediaRef ("idb:<id>"). */
export async function putMedia(blob: Blob): Promise<string> {
  const id = uid('m');
  await tx('readwrite', (s) => s.put(blob, id));
  return `idb:${id}`;
}

export async function deleteMedia(ref?: string): Promise<void> {
  if (!ref?.startsWith('idb:')) return;
  await tx('readwrite', (s) => s.delete(ref.slice(4))).catch(() => undefined);
}

export async function clearMedia(): Promise<void> {
  await tx('readwrite', (s) => s.clear()).catch(() => undefined);
}

/** Resolves a MediaRef to a playable URL. Callers must revoke `blob:` URLs they receive. */
export async function resolveMedia(ref?: string): Promise<string | null> {
  if (!ref) return null;
  if (ref.startsWith('asset:')) return ASSETS[ref.slice(6)] ?? null;
  if (ref.startsWith('idb:')) {
    const blob = await tx<Blob | undefined>('readonly', (s) => s.get(ref.slice(4)));
    return blob ? URL.createObjectURL(blob) : null;
  }
  return null;
}

/** Downscales a camera photo to a reasonable JPEG before storing it. */
export async function shrinkImage(file: Blob, max = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.82),
  );
}
