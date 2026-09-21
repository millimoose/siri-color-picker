import { Button, FormControlLabel, FormGroup, Paper, Slider, Stack } from '@mui/material';
import { ColorFilters } from '../filterColors';

interface FilterPanelProps {
  value: ColorFilters;
  onChange: (patch: Partial<ColorFilters>) => void;
  onReset: () => void;
}

export function FilterPanel({ value, onChange, onReset }: FilterPanelProps) {
  return (
    <Paper>
      <FormGroup
        sx={{
          '& .MuiSlider-track': { background: 'none' },
        }}
      >
        <FormControlLabel
          control={
            <Slider
              min={0}
              max={360}
              value={value.middleHue}
              valueLabelDisplay="auto"
              onChange={(_, val) => onChange({ middleHue: val as number })}
              sx={{
                '& .MuiSlider-rail': {
                  background:
                    'linear-gradient(to right, hsl(0, 100%, 50%), hsl(90, 100%, 50%), hsl(180, 100%, 50%),hsl(270, 100%, 50%),hsl(360, 100%, 50%))',
                },
              }}
            />
          }
          label="Middle Hue"
          labelPlacement="top"
        />
        <hr />
        <FormControlLabel
          control={
            <Slider
              min={-180}
              max={180}
              valueLabelDisplay="auto"
              value={[value.hueFrom, value.hueTo]}
              onChange={(_, range) => {
                const [from, to] = range as [number, number];
                onChange({ hueFrom: from, hueTo: to });
              }}
              sx={{
                '& .MuiSlider-rail': {
                  background: `linear-gradient(to right, ${[0, 1, 2, 3, 4]
                    .map((idx) => `hsl(${value.middleHue + idx * 90 - 180}, 100%, 50%)`)
                    .join(', ')})`,
                },
              }}
            />
          }
          label="Hue"
          labelPlacement="top"
        />
        <hr />
        <FormControlLabel
          control={
            <Slider
              min={0}
              max={100}
              valueLabelDisplay="auto"
              value={[value.lumFrom, value.lumTo]}
              onChange={(_, range) => {
                const [from, to] = range as [number, number];
                onChange({ lumFrom: from, lumTo: to });
              }}
              sx={{
                '& .MuiSlider-rail': {
                  background: `linear-gradient(to right, hsl(${value.middleHue}, 100%, 0%), hsl(${value.middleHue}, 100%, 50%))`,
                },
              }}
            />
          }
          label="Luminance"
          labelPlacement="top"
        />
        <hr />
        <Stack direction="row">
          <Button onClick={onReset}>Reset</Button>
        </Stack>
      </FormGroup>
    </Paper>
  );
}
