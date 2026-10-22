import { useSyncExternalStore } from 'react';
import { getPalettesSnapshot, getServerPalettesSnapshot, subscribePalettes } from './palettes';

export function usePalettes() {
  return useSyncExternalStore(subscribePalettes, getPalettesSnapshot, getServerPalettesSnapshot);
}
