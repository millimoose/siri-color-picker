// Named palettes: validation, localStorage persistence, and the external store
// that React subscribes to. Everything except the two store reads is pure so the
// rules are testable without a DOM, and no storage access happens at import time
// (the route is prerendered on the server).

export interface Palette {
  id: string;
  name: string;
  colors: string[]; // 1..6 uppercase #RRGGBB
  createdAt: string; // ISO timestamp
}

export interface PaletteStoreState {
  palettes: Palette[];
  // 'partial': the envelope parsed, but some entries were unusable and skipped.
  error: 'corrupt' | 'partial' | 'unavailable' | null;
}

export const PALETTE_STORAGE_KEY = 'siri-color-picker:palettes:v1';
export const MAX_PALETTE_COLORS = 6;
export const MAX_PALETTE_NAME_LENGTH = 40;

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const EMPTY_NAME = 'Untitled palette';

const SERVER_STATE: PaletteStoreState = Object.freeze({ palettes: [], error: null });
let cached: PaletteStoreState | null = null;
const listeners = new Set<() => void>();
let storageListening = false;

function readPaletteEntry(entry: unknown): { palette: Palette | null; partial: boolean } {
  if (entry === null || typeof entry !== 'object') return { palette: null, partial: true };
  const record = entry as Record<string, unknown>;

  const id = record.id;
  if (typeof id !== 'string' || id.length === 0) return { palette: null, partial: true };

  const rawName = record.name;
  const name = typeof rawName === 'string' ? normalizePaletteName(rawName) : null;
  if (name === null) return { palette: null, partial: true };

  const createdAt = record.createdAt;
  if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) {
    return { palette: null, partial: true };
  }

  const rawColors = record.colors;
  if (!Array.isArray(rawColors)) return { palette: null, partial: true };

  const colors: string[] = [];
  let partial = false;
  for (const value of rawColors) {
    if (typeof value !== 'string' || !HEX_PATTERN.test(value)) {
      partial = true;
      continue;
    }
    const hex = value.toUpperCase();
    if (colors.includes(hex) || colors.length === MAX_PALETTE_COLORS) {
      partial = true;
      continue;
    }
    colors.push(hex);
  }
  if (colors.length === 0) return { palette: null, partial: true };

  return { palette: { id, name, colors, createdAt }, partial };
}

export function parseStoredPalettes(raw: string | null): PaletteStoreState {
  if (raw === null) return { palettes: [], error: null };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { palettes: [], error: 'corrupt' };
  }
  if (value === null || typeof value !== 'object') {
    return { palettes: [], error: 'corrupt' };
  }
  const envelope = value as { version?: unknown; palettes?: unknown };
  if (envelope.version !== 1 || !Array.isArray(envelope.palettes)) {
    return { palettes: [], error: 'corrupt' };
  }

  const palettes: Palette[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  let partial = false;

  for (const entry of envelope.palettes) {
    const { palette, partial: entryPartial } = readPaletteEntry(entry);
    partial ||= entryPartial;
    if (palette === null) continue;
    const key = palette.name.toLowerCase();
    if (ids.has(palette.id) || names.has(key)) {
      partial = true;
      continue;
    }
    ids.add(palette.id);
    names.add(key);
    palettes.push(palette);
  }

  return { palettes, error: partial ? 'partial' : null };
}

function notify() {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== PALETTE_STORAGE_KEY) return;
  cached = null;
  notify();
}

function readFromStorage(): PaletteStoreState {
  try {
    return parseStoredPalettes(window.localStorage.getItem(PALETTE_STORAGE_KEY));
  } catch {
    return { palettes: [], error: 'unavailable' };
  }
}

export function getPalettesSnapshot(): PaletteStoreState {
  if (typeof window === 'undefined') return SERVER_STATE;
  cached ??= readFromStorage();
  return cached;
}

export function getServerPalettesSnapshot(): PaletteStoreState {
  return SERVER_STATE;
}

export function subscribePalettes(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined' && !storageListening) {
    window.addEventListener('storage', handleStorage);
    storageListening = true;
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && storageListening) {
      window.removeEventListener('storage', handleStorage);
      storageListening = false;
    }
  };
}

function commit(palettes: Palette[]): boolean {
  const current = getPalettesSnapshot();
  // A read that threw means an envelope may exist that this session cannot see;
  // writing would replace it. Stay in memory until a later read succeeds.
  if (current.error === 'unavailable') {
    cached = { palettes, error: 'unavailable' };
    notify();
    return false;
  }
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({ version: 1, palettes }));
    cached = { palettes, error: null };
    notify();
    return true;
  } catch {
    cached = { palettes, error: current.error };
    notify();
    return false;
  }
}

export function normalizePaletteName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_PALETTE_NAME_LENGTH ? trimmed : null;
}

export function hasPaletteName(palettes: readonly Palette[], name: string): boolean {
  const normalized = normalizePaletteName(name);
  if (normalized === null) return false;
  const target = normalized.toLowerCase();
  return palettes.some((palette) => palette.name.trim().toLowerCase() === target);
}

export function defaultPaletteName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const stem = (dot > 0 ? fileName.slice(0, dot) : fileName).trim();
  const name = stem.slice(0, MAX_PALETTE_NAME_LENGTH);
  return name.length > 0 ? name : EMPTY_NAME;
}

export type AddPaletteResult =
  | { ok: true; palette: Palette; persisted: boolean }
  | { ok: false; reason: 'invalid' | 'duplicate-name' };

function normalizeColors(input: readonly string[]): string[] | null {
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== 'string' || !HEX_PATTERN.test(value)) return null;
    seen.add(value.toUpperCase());
  }
  const colors = [...seen].slice(0, MAX_PALETTE_COLORS);
  return colors.length > 0 ? colors : null;
}

export function addPalette(input: { name: string; colors: string[] }): AddPaletteResult {
  const state = getPalettesSnapshot();
  const name = normalizePaletteName(input.name);
  const colors = normalizeColors(input.colors);
  if (name === null || colors === null) return { ok: false, reason: 'invalid' };
  if (hasPaletteName(state.palettes, name)) return { ok: false, reason: 'duplicate-name' };

  const palette: Palette = {
    id:
      crypto.randomUUID?.() ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    colors,
    createdAt: new Date().toISOString(),
  };
  return { ok: true, palette, persisted: commit([...state.palettes, palette]) };
}

export function deletePalette(id: string): boolean {
  const state = getPalettesSnapshot();
  if (!state.palettes.some((palette) => palette.id === id)) return false;
  return commit(state.palettes.filter((palette) => palette.id !== id));
}
