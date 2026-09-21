import { Container, Paper, Stack } from '@mui/material';
import { useMemo, useState } from 'react';
import { ColorCard } from './components/ColorCard';
import { FilterPanel } from './components/FilterPanel';
import { ColorFilters, DEFAULT_FILTERS, selectColorGroups } from './filterColors';

function App() {
  const [filters, setFilters] = useState<ColorFilters>(DEFAULT_FILTERS);
  const groups = useMemo(() => selectColorGroups(filters), [filters]);

  return (
    <Container fixed>
      <Stack spacing={2}>
        <FilterPanel
          value={filters}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />
        <Paper>
          <Stack direction="row" spacing={2} sx={{ overflowX: 'auto' }}>
            {groups.map((group, gi) => (
              <Stack key={gi} spacing={0.5}>
                {group.map(([name, hex]) => (
                  <ColorCard key={name} name={name} hex={hex} />
                ))}
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

export default App;
