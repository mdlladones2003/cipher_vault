import { useState } from "react";
import {
  ArrowLeftRight,
  CircleAlert,
  CircleCheck,
  LockKeyhole,
  ShieldAlert,
  X,
} from "lucide-react";

import { CipherPanel } from "@/components/CipherPanel";
import { PreviewDialog } from "@/components/PreviewDialog";
import { SettingsBar } from "@/components/SettingsBar";
import { useCipherFiles } from "@/hooks/useCipherFiles";
import { DEFAULT_SETTINGS, type CipherSettings } from "@/lib/cipher";
import type { StoredFile } from "@/lib/opfs";
import { cn } from "@/lib/utils";

export default function App() {
  const [settings, setSettings] = useState<CipherSettings>(DEFAULT_SETTINGS);
  const [previewing, setPreviewing] = useState<StoredFile | null>(null);

  const {
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
  } = useCipherFiles(settings);

  return (
    <div className="min-h-svh bg-[var(--canvas)]">
      <header className="border-b border-white/[0.08] bg-[rgba(8,10,20,0.92)] text-secondary-foreground backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-primary text-primary-foreground shadow-[0_0_20px_rgba(212,175,55,0.08)]">
              <LockKeyhole className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">Cipher Vault</h1>
              <p className="hidden text-sm text-muted-foreground sm:block">
                Private text encryption and decryption
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7">
        <section className="flex flex-col gap-2 pb-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-[2rem] sm:leading-tight">
              Transform text without sending it anywhere.
            </h2>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground sm:max-w-52 sm:justify-end">
            <ArrowLeftRight className="size-4 shrink-0" />
            Files can move directly between both panels.
          </p>
        </section>

        {!supported && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-card p-4 text-sm"
          >
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p>
              This browser does not support the Origin Private File System (OPFS), so files can’t be
              stored. Try a current version of Chrome, Edge, Safari or Firefox.
            </p>
          </div>
        )}

        <SettingsBar settings={settings} onChange={setSettings} />

        {notices.length > 0 && (
          <ul
            className="fixed top-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:top-5 sm:right-5"
            aria-live="polite"
            aria-label="Notifications"
          >
            {notices.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-[rgba(17,19,30,0.96)] px-4 py-3 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-md",
                  n.kind === "error" ? "border-destructive/50" : "border-primary/50",
                )}
              >
                {n.kind === "error" ? (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                )}
                <span className="flex-1">{n.message}</span>
                <button
                  type="button"
                  onClick={() => dismissNotice(n.id)}
                  aria-label="Dismiss"
                  className="rounded-sm opacity-60 hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={cn("grid gap-5 lg:grid-cols-2", !ready && "opacity-60")}>
          {(["encrypt", "decrypt"] as const).map((mode) => (
            <CipherPanel
              key={mode}
              mode={mode}
              files={files}
              busy={busy}
              disabled={!supported || !ready}
              onDrop={handleDrop}
              onPick={handlePicked}
              onPreview={setPreviewing}
              onDownload={download}
              onRemove={remove}
              onClear={clear}
            />
          ))}
        </div>
      </main>

      <PreviewDialog
        file={previewing}
        onClose={() => setPreviewing(null)}
        read={read}
        onDownload={download}
      />
    </div>
  );
}
