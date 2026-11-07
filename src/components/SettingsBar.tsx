import { KeyRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { METHOD_LABELS, type CipherMethod, type CipherSettings } from "@/lib/cipher";
import { cn } from "@/lib/utils";

interface SettingsBarProps {
  settings: CipherSettings;
  onChange: (next: CipherSettings) => void;
}

const METHODS: CipherMethod[] = ["caesar", "vigenere", "aes"];

export function SettingsBar({ settings, onChange }: SettingsBarProps) {
  const patch = (p: Partial<CipherSettings>) => onChange({ ...settings, ...p });

  return (
    <Card className="py-4 shadow-sm">
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Cipher</span>
          <div role="radiogroup" aria-label="Cipher method" className="inline-flex rounded-lg bg-muted p-1">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={settings.method === m}
                onClick={() => patch({ method: m })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  settings.method === m
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="cipher-key" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <KeyRound className="size-3.5" />
            {settings.method === "caesar" && "Shift key (number of positions)"}
            {settings.method === "vigenere" && "Keyword (letters only)"}
            {settings.method === "aes" && "Passphrase"}
          </label>

          {settings.method === "caesar" && (
            <Input
              id="cipher-key"
              type="number"
              className="md:max-w-40"
              value={settings.shift}
              onChange={(e) => patch({ shift: Number.parseInt(e.target.value, 10) || 0 })}
            />
          )}
          {settings.method === "vigenere" && (
            <Input
              id="cipher-key"
              className="md:max-w-xs"
              value={settings.keyword}
              placeholder="e.g. LEMON"
              onChange={(e) => patch({ keyword: e.target.value.replace(/[^a-zA-Z]/g, "") })}
            />
          )}
          {settings.method === "aes" && (
            <Input
              id="cipher-key"
              type="password"
              className="md:max-w-xs"
              value={settings.passphrase}
              placeholder="Required to encrypt and decrypt"
              autoComplete="off"
              onChange={(e) => patch({ passphrase: e.target.value })}
            />
          )}
        </div>

        <p className="max-w-xs text-xs text-muted-foreground">
          {settings.method === "aes"
            ? "AES-GCM output is Base64 text. Use the same passphrase to decrypt."
            : "Caesar and Vigenère are for learning only — not secure for real data."}
        </p>
      </CardContent>
    </Card>
  );
}
