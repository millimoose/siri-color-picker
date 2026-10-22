import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  defaultPaletteName,
  hasPaletteName,
  normalizePaletteName,
  parseStoredPalettes,
} from './palettes';

const KEY = 'siri-color-picker:palettes:v1';
const CREATED_AT = '2026-01-01T00:00:00.000Z';

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const getItem = vi.fn((key: string) => map.get(key) ?? null);
  const setItem = vi.fn((key: string, value: string) => {
    map.set(key, value);
  });
  const storage = {
    getItem,
    setItem,
    removeItem: vi.fn((key: string) => map.delete(key)),
    clear: vi.fn(() => map.clear()),
    key: vi.fn(() => null),
    length: 0,
  } as unknown as Storage;
  return { storage, getItem, setItem, map };
}

async function loadStore(storage: Storage) {
  vi.resetModules();
  const addEventListener = vi.fn((_type: string, _handler: (event: StorageEvent) => void) => {});
  vi.stubGlobal('window', {
    localStorage: storage,
    addEventListener,
    removeEventListener: vi.fn(),
  });
  // Dynamic import is the point: each test needs a fresh module instance with
  // its own cache, and the server test needs one imported with no `window`.
  const store = await import('./palettes');
  return { store, addEventListener };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('parseStoredPalettes', () => {
  it('returns an empty clean state for missing data', () => {
    expect(parseStoredPalettes(null)).toEqual({ palettes: [], error: null });
  });

  it('flags malformed JSON and wrong versions as corrupt', () => {
    expect(parseStoredPalettes('{')).toEqual({ palettes: [], error: 'corrupt' });
    expect(parseStoredPalettes('{"version":2,"palettes":[]}')).toEqual({
      palettes: [],
      error: 'corrupt',
    });
  });

  it('keeps valid entries, drops unusable ones, and reports partial', () => {
    const raw = JSON.stringify({
      version: 1,
      palettes: [
        { id: 'a', name: 'Sunset', colors: ['#ff0000'], createdAt: CREATED_AT },
        { id: 'b', name: 'Broken', colors: ['red'], createdAt: CREATED_AT },
      ],
    });
    expect(parseStoredPalettes(raw)).toEqual({
      palettes: [{ id: 'a', name: 'Sunset', colors: ['#FF0000'], createdAt: CREATED_AT }],
      error: 'partial',
    });
  });

  it('normalizes colors, caps at six, and keeps the first duplicate id/name', () => {
    const raw = JSON.stringify({
      version: 1,
      palettes: [
        {
          id: 'a',
          name: 'Sunset',
          createdAt: CREATED_AT,
          colors: [
            '#ff0000',
            '#FF0000',
            '#00ff00',
            '#0000ff',
            '#ffff00',
            '#00ffff',
            '#ff00ff',
            '#123456',
          ],
        },
        { id: 'a', name: 'Other', colors: ['#111111'], createdAt: CREATED_AT },
        { id: 'b', name: '  SUNSET ', colors: ['#222222'], createdAt: CREATED_AT },
      ],
    });
    expect(parseStoredPalettes(raw)).toEqual({
      palettes: [
        {
          id: 'a',
          name: 'Sunset',
          createdAt: CREATED_AT,
          colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'],
        },
      ],
      error: 'partial',
    });
  });
});

describe('palette store', () => {
  it('writes the envelope and updates the snapshot on add', async () => {
    const { storage, setItem } = makeStorage();
    const { store } = await loadStore(storage);
    const result = store.addPalette({ name: '  Bay  ', colors: ['#ff0000', '#FF0000'] });
    if (!result.ok) throw new Error('expected ok');
    expect(result.persisted).toBe(true);
    expect(result.palette).toMatchObject({ name: 'Bay', colors: ['#FF0000'] });
    expect(setItem).toHaveBeenCalledWith(
      KEY,
      JSON.stringify({ version: 1, palettes: [result.palette] }),
    );
    expect(store.getPalettesSnapshot()).toEqual({ palettes: [result.palette], error: null });
  });

  it('rejects invalid and duplicate names, case- and whitespace-insensitively', async () => {
    const { storage } = makeStorage();
    const { store } = await loadStore(storage);
    expect(store.addPalette({ name: '   ', colors: ['#FF0000'] })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(store.addPalette({ name: 'a'.repeat(41), colors: ['#FF0000'] })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(store.addPalette({ name: 'Not a color', colors: ['red'] })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(store.addPalette({ name: 'Bay', colors: ['#FF0000'] }).ok).toBe(true);
    expect(store.addPalette({ name: '  bay  ', colors: ['#00FF00'] })).toEqual({
      ok: false,
      reason: 'duplicate-name',
    });
  });

  it('removes a palette and persists the removal', async () => {
    const { storage, setItem } = makeStorage();
    const { store } = await loadStore(storage);
    const first = store.addPalette({ name: 'One', colors: ['#FF0000'] });
    const second = store.addPalette({ name: 'Two', colors: ['#00FF00'] });
    if (!first.ok || !second.ok) throw new Error('expected ok');
    expect(store.deletePalette(first.palette.id)).toBe(true);
    expect(store.getPalettesSnapshot().palettes.map((p) => p.name)).toEqual(['Two']);
    expect(setItem).toHaveBeenCalledTimes(3);
  });

  it('keeps the in-memory palette when the write throws', async () => {
    const { storage, setItem } = makeStorage();
    const { store } = await loadStore(storage);
    setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    expect(store.addPalette({ name: 'Session', colors: ['#FF0000'] })).toMatchObject({
      ok: true,
      persisted: false,
    });
    expect(store.getPalettesSnapshot().palettes.map((p) => p.name)).toEqual(['Session']);
  });

  it('deletes from memory and returns false when the delete write throws', async () => {
    const { storage, setItem } = makeStorage();
    const { store } = await loadStore(storage);
    const added = store.addPalette({ name: 'Doomed', colors: ['#FF0000'] });
    if (!added.ok) throw new Error('expected ok');
    setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    expect(store.deletePalette(added.palette.id)).toBe(false);
    expect(store.getPalettesSnapshot().palettes).toEqual([]);
  });

  it('surfaces a throwing read as unavailable and never writes', async () => {
    const { storage, getItem, setItem } = makeStorage();
    getItem.mockImplementation(() => {
      throw new Error('blocked');
    });
    const { store } = await loadStore(storage);
    expect(store.getPalettesSnapshot()).toEqual({ palettes: [], error: 'unavailable' });
    const added = store.addPalette({ name: 'Memory', colors: ['#FF0000'] });
    if (!added.ok) throw new Error('expected ok');
    expect(added.persisted).toBe(false);
    expect(store.deletePalette(added.palette.id)).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('recovers from corrupt storage on the next successful save', async () => {
    const { storage, setItem } = makeStorage({ [KEY]: '{' });
    const { store } = await loadStore(storage);
    expect(store.getPalettesSnapshot().error).toBe('corrupt');
    expect(store.addPalette({ name: 'Fixed', colors: ['#FF0000'] })).toMatchObject({
      ok: true,
      persisted: true,
    });
    expect(store.getPalettesSnapshot().error).toBeNull();
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('returns a stable empty snapshot on the server', async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    // Import with no `window` stub to exercise the SSR path.
    const store = await import('./palettes');
    const server = store.getServerPalettesSnapshot();
    expect(store.getPalettesSnapshot()).toBe(server);
    expect(store.getServerPalettesSnapshot()).toBe(server);
    expect(server).toEqual({ palettes: [], error: null });
  });

  it('invalidates the cache when storage changes in another tab', async () => {
    const { storage, map } = makeStorage();
    const { store, addEventListener } = await loadStore(storage);
    const listener = vi.fn();
    store.subscribePalettes(listener);
    const handler = addEventListener.mock.calls.find(([type]) => type === 'storage')?.[1];
    if (!handler) throw new Error('missing storage listener');
    const remote = { id: 'x', name: 'Remote', colors: ['#FF0000'], createdAt: CREATED_AT };
    map.set(KEY, JSON.stringify({ version: 1, palettes: [remote] }));
    handler({ key: KEY } as StorageEvent);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getPalettesSnapshot().palettes).toEqual([remote]);
  });
});

describe('name helpers', () => {
  it('derives a default name from the filename', () => {
    expect(defaultPaletteName('sunset-over-bay.png')).toBe('sunset-over-bay');
    expect(defaultPaletteName('.hidden')).toBe('.hidden');
    expect(defaultPaletteName('a'.repeat(60) + '.jpg')).toBe('a'.repeat(40));
    expect(defaultPaletteName('   .png')).toBe('Untitled palette');
  });

  it('normalizes and compares names', () => {
    expect(normalizePaletteName('  Bay ')).toBe('Bay');
    expect(normalizePaletteName('   ')).toBeNull();
    expect(normalizePaletteName('a'.repeat(41))).toBeNull();
    const palettes = [{ id: '1', name: 'Bay', colors: ['#FF0000'], createdAt: CREATED_AT }];
    expect(hasPaletteName(palettes, '  bAY ')).toBe(true);
    expect(hasPaletteName(palettes, 'Bayou')).toBe(false);
  });
});
