import { CssBaseline, Container, Paper, Stack } from '@mui/material';
import { useDeferredValue, useMemo, useState } from 'react';
import { ColorCard } from './components/ColorCard';
import { FilterPanel } from './components/FilterPanel';
import { ColorFilters, DEFAULT_FILTERS, selectColorGroups } from './filterColors';

function App() {
  const [filters, setFilters] = useState<ColorFilters>(DEFAULT_FILTERS);
  // Keep the sliders on the immediate value so scrubbing stays responsive,
  // and let the grid catch up at background priority.
  const deferredFilters = useDeferredValue(filters);
  const groups = useMemo(() => selectColorGroups(deferredFilters), [deferredFilters]);

  return (
    <>
      <CssBaseline />
      <Container fixed sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
          <FilterPanel
            value={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
          <Paper sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Stack direction="row" spacing={2} sx={{ p: 2 }}>
              {groups.map((group, gi) => (
                <Stack key={gi} spacing={0.5} sx={{ flex: 1, minWidth: 240 }}>
                  {group.map((color) => (
                    <ColorCard
                      key={color.name}
                      name={color.name}
                      hex={color.hex}
                      hue={color.hue}
                      lum={color.lum}
                    />
                  ))}
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}

export default App;
