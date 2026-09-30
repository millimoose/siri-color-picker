import { useDeferredValue, useMemo, useState } from 'react';
import { ColorResults } from '~/components/ColorResults';
import { FilterPanel } from '~/components/FilterPanel';
import { COLOR_ENTRIES } from '~/lib/colors';
import { ColorFilters, DEFAULT_FILTERS, selectColorGroups } from '~/lib/filterColors';
import { useIsStacked } from '~/lib/useIsStacked';
import { cn } from '~/lib/utils';

function App() {
  const [filters, setFilters] = useState<ColorFilters>(DEFAULT_FILTERS);
  // Keep the sliders on the immediate value so scrubbing stays responsive,
  // and let the grid catch up at background priority.
  const deferredFilters = useDeferredValue(filters);
  const groups = useMemo(() => selectColorGroups(deferredFilters), [deferredFilters]);
  const matchCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);
  const isStacked = useIsStacked();
  const density = 'compact';

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-5 p-[clamp(1rem,3vw,2rem)]">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Siri Color Picker</h1>
        <p className="text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">{matchCount}</strong> of{' '}
          {COLOR_ENTRIES.length} named colors · tap a swatch to copy its hex
        </p>
      </header>
      <div className="flex flex-wrap items-start gap-4">
        <div className={cn('sticky min-w-0 flex-[1_1_320px]', isStacked ? 'top-0' : 'top-6')}>
          <FilterPanel
            value={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </div>
        <ColorResults
          className="min-w-0 flex-[999_1_480px]"
          groups={groups}
          density={density}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />
      </div>
    </div>
  );
}

export default App;
