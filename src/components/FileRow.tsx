import { Download, Eye, FileText, GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { INTERNAL_DRAG_TYPE } from "@/hooks/useCipherFiles";
import type { StoredFile } from "@/lib/opfs";
import { formatBytes, formatTime } from "@/lib/utils";

interface FileRowProps {
  file: StoredFile;
  /** Name of the panel this file can be dragged to, shown as a hint */
  dragHint: string;
  onPreview: (file: StoredFile) => void;
  onDownload: (file: StoredFile) => void;
  onRemove: (file: StoredFile) => void;
}

export function FileRow({ file, dragHint, onPreview, onDownload, onRemove }: FileRowProps) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(INTERNAL_DRAG_TYPE, file.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      title={`Drag to the ${dragHint} panel`}
      className="group flex min-w-0 cursor-grab items-center gap-2 rounded-lg border bg-card px-2 py-2.5 shadow-xs transition-colors hover:border-primary/60 active:cursor-grabbing sm:gap-3 sm:px-3"
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <FileText className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs leading-5 text-muted-foreground sm:truncate">
          {formatBytes(file.size)} · {file.keyLabel} · {formatTime(file.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Preview ${file.name}`}
          title="Preview"
          onClick={() => onPreview(file)}
        >
          <Eye />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Download ${file.name}`}
          title="Download"
          onClick={() => onDownload(file)}
        >
          <Download />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${file.name}`}
          title="Delete"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(file)}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
