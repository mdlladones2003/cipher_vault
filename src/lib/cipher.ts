/**
 * Cipher implementations taken from the IAS "Cipher step-by-step" guide.
 *
 *  - Caesar:   shift every letter by a fixed key (HELLO + 3 -> KHOOR)
 *  - Vigenere: shift each letter by the matching letter of a repeating keyword
 *  - AES-GCM:  modern symmetric encryption (WebCrypto, PBKDF2 key derivation)
 *
 * Caesar and Vigenere only transform A-Z / a-z. Digits, spaces, punctuation and
 * line breaks are preserved, and letter case is kept.
 */

export type CipherMethod = "caesar" | "vigenere" | "aes";
export type CipherMode = "encrypt" | "decrypt";

export interface CipherSettings {
  method: CipherMethod;
  /** Caesar shift (any integer) */
  shift: number;
  /** Vigenere keyword (letters only) */
  keyword: string;
  /** AES passphrase */
  passphrase: string;
}

export const DEFAULT_SETTINGS: CipherSettings = {
  method: "caesar",
  shift: 3,
  keyword: "KEY",
  passphrase: "",
};

export const METHOD_LABELS: Record<CipherMethod, string> = {
  caesar: "Caesar",
  vigenere: "Vigenère",
  aes: "AES-GCM",
};

const A = 65;
const a = 97;

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function shiftChar(code: number, amount: number): number {
  if (code >= A && code <= A + 25) return A + mod(code - A + amount, 26);
  if (code >= a && code <= a + 25) return a + mod(code - a + amount, 26);
  return code;
}

export function caesar(text: string, shift: number, mode: CipherMode): string {
  const amount = mode === "encrypt" ? shift : -shift;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(shiftChar(text.charCodeAt(i), amount));
  }
  return out;
}

export function vigenere(text: string, keyword: string, mode: CipherMode): string {
  const key = keyword.toUpperCase().replace(/[^A-Z]/g, "");
  if (!key) throw new Error("Vigenère needs a keyword with at least one letter.");
  const dir = mode === "encrypt" ? 1 : -1;
  let out = "";
  let k = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const isLetter = (code >= A && code <= A + 25) || (code >= a && code <= a + 25);
    if (!isLetter) {
      out += text[i];
      continue;
    }
    const amount = (key.charCodeAt(k % key.length) - A) * dir;
    out += String.fromCharCode(shiftChar(code, amount));
    k++;
  }
  return out;
}

/* ------------------------------ AES-GCM ------------------------------ */

const enc = new TextEncoder();
const dec = new TextDecoder();
const PBKDF2_ITERATIONS = 150_000;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function aesEncrypt(text: string, passphrase: string): Promise<string> {
  if (!passphrase) throw new Error("AES needs a passphrase.");
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const key = await deriveKey(passphrase, salt);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text)),
  );
  const packed = new Uint8Array(salt.length + iv.length + cipher.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(cipher, salt.length + iv.length);
  return toBase64(packed);
}

async function aesDecrypt(payload: string, passphrase: string): Promise<string> {
  if (!passphrase) throw new Error("AES needs a passphrase.");
  let packed: Uint8Array<ArrayBuffer>;
  try {
    packed = fromBase64(payload);
  } catch {
    throw new Error("This file is not valid AES-GCM ciphertext (bad Base64).");
  }
  if (packed.length < 16 + 12 + 16) {
    throw new Error("This file is too short to be AES-GCM ciphertext.");
  }
  const salt = new Uint8Array(packed.buffer.slice(0, 16));
  const iv = new Uint8Array(packed.buffer.slice(16, 28));
  const data = new Uint8Array(packed.buffer.slice(28));
  const key = await deriveKey(passphrase, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return dec.decode(plain);
  } catch {
    throw new Error("Decryption failed: wrong passphrase or the file was modified.");
  }
}

/* ------------------------------ Public API ------------------------------ */

export async function applyCipher(
  text: string,
  mode: CipherMode,
  settings: CipherSettings,
): Promise<string> {
  switch (settings.method) {
    case "caesar":
      return caesar(text, settings.shift, mode);
    case "vigenere":
      return vigenere(text, settings.keyword, mode);
    case "aes":
      return mode === "encrypt"
        ? aesEncrypt(text, settings.passphrase)
        : aesDecrypt(text.trim(), settings.passphrase);
  }
}

/** Short human-readable description of the key currently in use. */
export function describeKey(settings: CipherSettings): string {
  switch (settings.method) {
    case "caesar":
      return `Caesar · shift ${settings.shift}`;
    case "vigenere":
      return `Vigenère · “${settings.keyword.toUpperCase()}”`;
    case "aes":
      return "AES-GCM · passphrase";
  }
}
