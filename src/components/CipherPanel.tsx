import { useRef, useState } from "react";
import { FileUp, Loader2, LockKeyhole, LockKeyholeOpen, Trash2 } from "lucide-react";

import { FileRow } from "@/components/FileRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CipherMode } from "@/lib/cipher";
import type { StoredFile } from "@/lib/opfs";
import { cn } from "@/lib/utils";

interface CipherPanelProps {
  mode: CipherMode;
  files: StoredFile[];
  busy: boolean;
  disabled: boolean;
  onDrop: (mode: CipherMode, dt: DataTransfer) => void;
  onPick: (mode: CipherMode, files: File[]) => void;
  onPreview: (file: StoredFile) => void;
  onDownload: (file: StoredFile) => void;
  onRemove: (file: StoredFile) => void;
  onClear: (mode: CipherMode) => void;
}

const COPY = {
  encrypt: {
    title: "Encrypt",
    description: "Readable text in, ciphertext out.",
    hint: "Drop .txt files here to encrypt them",
    other: "Decrypt",
    Icon: LockKeyhole,
  },
  decrypt: {
    title: "Decrypt",
    description: "Ciphertext in, readable text out.",
    hint: "Drop .txt files here to decrypt them",
    other: "Encrypt",
    Icon: LockKeyholeOpen,
  },
} as const;

export function CipherPanel({
  mode,
  files,
  busy,
  disabled,
  onDrop,
  onPick,
  onPreview,
  onDownload,
  onRemove,
  onClear,
}: CipherPanelProps) {
  const copy = COPY[mode];
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const panelFiles = files.filter((f) => f.mode === mode);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-lg",
                mode === "encrypt"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              <copy.Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-lg">{copy.title}</CardTitle>
              <CardDescription className="mt-1">{copy.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 whitespace-nowrap">
            {panelFiles.length} file{panelFiles.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div
          role="button"
          tabIndex={0}
          aria-label={copy.hint}
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            depth.current++;
            setOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={() => {
            depth.current = Math.max(0, depth.current - 1);
            if (depth.current === 0) setOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            depth.current = 0;
            setOver(false);
            if (!disabled) onDrop(mode, e.dataTransfer);
          }}
          className={cn(
            "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            over
              ? "border-primary bg-accent"
              : "border-muted-foreground/40 bg-background/40 hover:border-primary/70",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {busy ? (
            <Loader2 className="size-8 animate-spin text-primary" />
          ) : (
            <FileUp className={cn("size-8", over ? "text-primary" : "text-muted-foreground")} />
          )}
          <p className="text-sm font-medium">{busy ? "Working…" : copy.hint}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,text/plain"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (picked.length) onPick(mode, picked);
            }}
          />
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {mode === "encrypt" ? "Encrypted files" : "Decrypted files"}
          </h3>
          {panelFiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onClear(mode)}
            >
              <Trash2 /> Clear all
            </Button>
          )}
        </div>

        {panelFiles.length === 0 ? (
          <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        ) : (
          <ul className="flex max-h-96 min-w-0 flex-col gap-2 overflow-y-auto pr-1">
            {panelFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                dragHint={copy.other}
                onPreview={onPreview}
                onDownload={onDownload}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
