import { useDeferredValue, useMemo, useState } from 'react';
import { Palette as PaletteIcon } from 'lucide-react';
import { ColorResults } from '~/components/ColorResults';
import { FilterPanel } from '~/components/FilterPanel';
import { PaletteManagerDialog } from '~/components/PaletteManagerDialog';
import { PaletteSourceBar } from '~/components/PaletteSourceBar';
import { Button } from '~/components/ui/button';
import {
  COLOR_ITEMS,
  ColorFilters,
  DEFAULT_FILTERS,
  selectColorGroups,
  toColorItems,
} from '~/lib/filterColors';
import { useIsStacked } from '~/lib/useIsStacked';
import { usePalettes } from '~/lib/usePalettes';
import { cn } from '~/lib/utils';

function App() {
  const [filters, setFilters] = useState<ColorFilters>(DEFAULT_FILTERS);
  // Keep the sliders on the immediate value so scrubbing stays responsive,
  // and let the grid catch up at background priority.
  const deferredFilters = useDeferredValue(filters);
  const { palettes, error: paletteError } = usePalettes();
  const [sourceId, setSourceId] = useState('named');
  const [paletteDialogOpen, setPaletteDialogOpen] = useState(false);
  // A deleted palette falls back to named colors without a second state write.
  const activePalette = palettes.find((palette) => palette.id === sourceId) ?? null;
  const effectiveSourceId = activePalette ? sourceId : 'named';
  const items = useMemo(
    () => (activePalette ? toColorItems(activePalette.colors) : COLOR_ITEMS),
    [activePalette],
  );
  const groups = useMemo(() => selectColorGroups(deferredFilters, items), [deferredFilters, items]);
  const matchCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);
  const isStacked = useIsStacked();
  const density = 'compact';

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-5 p-[clamp(1rem,3vw,2rem)]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Siri Color Picker</h1>
          <p className="text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">{matchCount}</strong> of {items.length}{' '}
            {activePalette ? <>colors in “{activePalette.name}”</> : 'named colors'} · tap a swatch
            to copy its hex
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPaletteDialogOpen(true)}>
          <PaletteIcon />
          Palettes
        </Button>
      </header>
      <div className="flex flex-wrap items-start gap-4">
        <div className={cn('sticky min-w-0 flex-[1_1_320px]', isStacked ? 'top-0' : 'top-6')}>
          <FilterPanel
            value={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </div>
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-3">
          <PaletteSourceBar
            palettes={palettes}
            value={effectiveSourceId}
            onChange={setSourceId}
            onFromPhoto={() => setPaletteDialogOpen(true)}
          />
          <ColorResults
            className="min-w-0"
            groups={groups}
            density={density}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </div>
      </div>
      <PaletteManagerDialog
        open={paletteDialogOpen}
        onOpenChange={setPaletteDialogOpen}
        palettes={palettes}
        error={paletteError}
        onSelect={setSourceId}
      />
    </div>
  );
}

export default App;
