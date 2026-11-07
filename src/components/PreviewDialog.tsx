import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBytes } from "@/lib/utils";
import type { StoredFile } from "@/lib/opfs";

interface PreviewDialogProps {
  file: StoredFile | null;
  onClose: () => void;
  read: (file: StoredFile) => Promise<string>;
  onDownload: (file: StoredFile) => void;
}

export function PreviewDialog({ file, onClose, read, onDownload }: PreviewDialogProps) {
  const [result, setResult] = useState<{
    file: StoredFile;
    content: string | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    read(file)
      .then((text) => {
        if (!cancelled) setResult({ file, content: text, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ file, content: null, error: "Could not read this file from storage." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file, read]);

  const currentResult = result?.file === file ? result : null;

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">{file?.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {file && (
              <>
                <Badge variant={file.mode === "encrypt" ? "default" : "secondary"}>
                  {file.mode === "encrypt" ? "Encrypted" : "Decrypted"}
                </Badge>
                <span>{file.keyLabel}</span>
                <span>·</span>
                <span>{formatBytes(file.size)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-auto rounded-md border bg-secondary p-4">
          {currentResult?.error ? (
            <p className="text-sm text-red-300">{currentResult.error}</p>
          ) : currentResult?.content === null || currentResult === null ? (
            <p className="text-sm text-secondary-foreground/70">Loading…</p>
          ) : (
            <pre className="font-mono text-sm wrap-break-word whitespace-pre-wrap text-secondary-foreground">
              {currentResult.content || "(empty file)"}
            </pre>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => file && onDownload(file)} disabled={!file}>
            <Download /> Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
