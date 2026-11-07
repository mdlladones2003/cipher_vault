import { useCallback, useEffect, useState } from "react";
import { applyCipher, describeKey, type CipherMode, type CipherSettings } from "@/lib/cipher";
import {
  clearMode,
  deleteStoredFile,
  downloadStoredFile,
  isOpfsSupported,
  loadIndex,
  readStoredFile,
  saveFile,
  type StoredFile,
} from "@/lib/opfs";

/** MIME type used when dragging a stored file between the two panels. */
export const INTERNAL_DRAG_TYPE = "application/x-cipher-file";

export interface AppNotice {
  id: string;
  kind: "error" | "success";
  message: string;
}

function outputName(original: string, mode: CipherMode): string {
  const base = original.replace(/\.txt$/i, "");
  if (mode === "encrypt") {
    return `${base.replace(/\.decrypted$/i, "")}.encrypted.txt`;
  }
  return `${base.replace(/\.encrypted$/i, "")}.decrypted.txt`;
}

function isTextFile(file: File): boolean {
  return file.type === "text/plain" || /\.txt$/i.test(file.name);
}

export function useCipherFiles(settings: CipherSettings) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const supported = isOpfsSupported();
  const [ready, setReady] = useState(!supported);
  const [busy, setBusy] = useState(false);
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const notify = useCallback((kind: AppNotice["kind"], message: string) => {
    setNotices((prev) => [...prev, { id: crypto.randomUUID(), kind, message }].slice(-4));
  }, []);

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    if (!supported) {
      return;
    }
    loadIndex()
      .then(setFiles)
      .catch(() => notify("error", "Could not read the private file system."))
      .finally(() => setReady(true));
  }, [supported, notify]);

  /**
   * Convert `items` (desktop files and/or already stored files) into `target` mode.
   * Items are processed one by one so index writes never race.
   */
  const convert = useCallback(
    async (target: CipherMode, items: { desktop: File[]; stored: StoredFile[] }) => {
      setBusy(true);
      let done = 0;
      try {
        const queue: { name: string; read: () => Promise<string> }[] = [
          ...items.desktop.map((f) => ({ name: f.name, read: () => f.text() })),
          ...items.stored.map((f) => ({ name: f.name, read: () => readStoredFile(f) })),
        ];

        for (const item of queue) {
          try {
            const text = await item.read();
            const result = await applyCipher(text, target, settings);
            const saved = await saveFile(
              target,
              outputName(item.name, target),
              result,
              describeKey(settings),
            );
            setFiles((prev) => [saved, ...prev]);
            done++;
          } catch (err) {
            notify(
              "error",
              `${item.name}: ${err instanceof Error ? err.message : "Something went wrong."}`,
            );
          }
        }
        if (done > 0) {
          notify(
            "success",
            `${done} file${done > 1 ? "s" : ""} ${target === "encrypt" ? "encrypted" : "decrypted"}.`,
          );
        }
      } finally {
        setBusy(false);
      }
    },
    [settings, notify],
  );

  /** Handle a drop event on the panel for `target`. */
  const handleDrop = useCallback(
    async (target: CipherMode, dt: DataTransfer) => {
      if (!supported) {
        notify("error", "This browser does not support the Origin Private File System.");
        return;
      }

      // 1) A stored file dragged from the other panel
      const internalId = dt.getData(INTERNAL_DRAG_TYPE);
      if (internalId) {
        const stored = files.find((f) => f.id === internalId);
        if (!stored) return;
        if (stored.mode === target) {
          notify(
            "error",
            `Drop it on the ${target === "encrypt" ? "Decrypt" : "Encrypt"} panel to convert it.`,
          );
          return;
        }
        await convert(target, { desktop: [], stored: [stored] });
        return;
      }

      // 2) Files dragged in from the desktop
      const dropped = Array.from(dt.files);
      const txt = dropped.filter(isTextFile);
      if (dropped.length > txt.length) {
        notify("error", "Only .txt files are supported — other files were skipped.");
      }
      if (txt.length > 0) await convert(target, { desktop: txt, stored: [] });
    },
    [convert, files, notify, supported],
  );

  /** Pick files through the file dialog instead of dragging. */
  const handlePicked = useCallback(
    async (target: CipherMode, picked: File[]) => {
      if (!supported) {
        notify("error", "This browser does not support the Origin Private File System.");
        return;
      }
      const txt = picked.filter(isTextFile);
      if (picked.length > txt.length) {
        notify("error", "Only .txt files are supported — other files were skipped.");
      }
      if (txt.length > 0) await convert(target, { desktop: txt, stored: [] });
    },
    [convert, notify, supported],
  );

  const remove = useCallback(async (file: StoredFile) => {
    await deleteStoredFile(file);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  }, []);

  const clear = useCallback(async (mode: CipherMode) => {
    await clearMode(mode);
    setFiles((prev) => prev.filter((f) => f.mode !== mode));
  }, []);

  const read = useCallback((file: StoredFile) => readStoredFile(file), []);
  const download = useCallback((file: StoredFile) => downloadStoredFile(file), []);

  return {
    files,
    ready,
    busy,
    supported,
    notices,
    dismissNotice,
    handleDrop,
    handlePicked,
    remove,
    clear,
    read,
    download,
  };
}
