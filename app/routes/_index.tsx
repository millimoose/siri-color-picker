import { useDeferredValue, useMemo, useState } from 'react';
import { ColorCard } from '~/components/ColorCard';
import { FilterPanel } from '~/components/FilterPanel';
import { ColorFilters, DEFAULT_FILTERS, selectColorGroups } from '~/lib/filterColors';

function App() {
  const [filters, setFilters] = useState<ColorFilters>(DEFAULT_FILTERS);
  // Keep the sliders on the immediate value so scrubbing stays responsive,
  // and let the grid catch up at background priority.
  const deferredFilters = useDeferredValue(filters);
  const groups = useMemo(() => selectColorGroups(deferredFilters), [deferredFilters]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col gap-4 p-4">
      <FilterPanel
        value={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
      <main className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border bg-card shadow-sm">
        <div className="flex w-max min-w-full flex-row gap-4 p-4">
          {groups.map((group, gi) => (
            <div key={gi} className="flex min-w-[240px] flex-1 flex-col gap-0.5">
              {group.map((color) => (
                <ColorCard
                  key={color.name}
                  name={color.name}
                  hex={color.hex}
                  hue={color.hue}
                  lum={color.lum}
                />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
