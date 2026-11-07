/**
 * Thin wrapper around the Origin Private File System (OPFS).
 *
 * Layout inside the origin-private root:
 *   cipher-vault/
 *     index.json            metadata for every stored file
 *     encrypt/<id>.txt      files produced by encryption
 *     decrypt/<id>.txt      files produced by decryption
 */

import type { CipherMode } from "./cipher";

export interface StoredFile {
  id: string;
  /** Display / download name */
  name: string;
  /** Which panel owns the file (what was done to produce it) */
  mode: CipherMode;
  size: number;
  createdAt: number;
  /** e.g. "Caesar · shift 3" */
  keyLabel: string;
}

const ROOT_DIR = "cipher-vault";
const INDEX_FILE = "index.json";

export function isOpfsSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.storage?.getDirectory;
}

async function rootDir(): Promise<FileSystemDirectoryHandle> {
  const opfs = await navigator.storage.getDirectory();
  return opfs.getDirectoryHandle(ROOT_DIR, { create: true });
}

async function modeDir(mode: CipherMode): Promise<FileSystemDirectoryHandle> {
  const root = await rootDir();
  return root.getDirectoryHandle(mode, { create: true });
}

async function writeText(dir: FileSystemDirectoryHandle, name: string, text: string) {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(text);
  } finally {
    await writable.close();
  }
}

async function readText(dir: FileSystemDirectoryHandle, name: string): Promise<string> {
  const handle = await dir.getFileHandle(name);
  const file = await handle.getFile();
  return file.text();
}

/* ------------------------------- Index ------------------------------- */

export async function loadIndex(): Promise<StoredFile[]> {
  const root = await rootDir();
  try {
    const raw = await readText(root, INDEX_FILE);
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredFile[]) : [];
  } catch {
    return [];
  }
}

async function saveIndex(entries: StoredFile[]) {
  const root = await rootDir();
  await writeText(root, INDEX_FILE, JSON.stringify(entries));
}

/* ------------------------------- Files ------------------------------- */

export async function saveFile(
  mode: CipherMode,
  name: string,
  content: string,
  keyLabel: string,
): Promise<StoredFile> {
  const id = crypto.randomUUID();
  const dir = await modeDir(mode);
  await writeText(dir, `${id}.txt`, content);

  const entry: StoredFile = {
    id,
    name,
    mode,
    size: new Blob([content]).size,
    createdAt: Date.now(),
    keyLabel,
  };
  const index = await loadIndex();
  await saveIndex([entry, ...index]);
  return entry;
}

export async function readStoredFile(file: StoredFile): Promise<string> {
  const dir = await modeDir(file.mode);
  return readText(dir, `${file.id}.txt`);
}

export async function deleteStoredFile(file: StoredFile): Promise<void> {
  const dir = await modeDir(file.mode);
  try {
    await dir.removeEntry(`${file.id}.txt`);
  } catch {
    /* already gone */
  }
  const index = await loadIndex();
  await saveIndex(index.filter((f) => f.id !== file.id));
}

export async function clearMode(mode: CipherMode): Promise<void> {
  const root = await rootDir();
  try {
    await root.removeEntry(mode, { recursive: true });
  } catch {
    /* nothing to remove */
  }
  const index = await loadIndex();
  await saveIndex(index.filter((f) => f.mode !== mode));
}

/** Trigger a browser download for a stored file. */
export async function downloadStoredFile(file: StoredFile): Promise<void> {
  const text = await readStoredFile(file);
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
