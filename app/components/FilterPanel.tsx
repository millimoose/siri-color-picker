import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Slider, SliderRange, SliderThumb, SliderTrack } from '~/components/ui/slider';
import { ColorFilters } from '~/lib/filterColors';

// Same rainbow rail MUI rendered: fixed stops sweeping the full wheel.
const MIDDLE_HUE_RAIL =
  'linear-gradient(to right, hsl(0, 100%, 50%), hsl(90, 100%, 50%), hsl(180, 100%, 50%), hsl(270, 100%, 50%), hsl(360, 100%, 50%))';

interface FilterPanelProps {
  value: ColorFilters;
  onChange: (patch: Partial<ColorFilters>) => void;
  onReset: () => void;
}

export function FilterPanel({ value, onChange, onReset }: FilterPanelProps) {
  // Rail gradients replicate the MUI look: the track shows the gradient, the
  // filled range is transparent. Formulas are ported verbatim from the
  // previous FilterPanel.
  const hueRail = `linear-gradient(to right, ${[0, 1, 2, 3, 4]
    .map((idx) => `hsl(${value.middleHue + idx * 90 - 180}, 100%, 50%)`)
    .join(', ')})`;
  const lumRail = `linear-gradient(to right, hsl(${value.middleHue}, 100%, 0%), hsl(${value.middleHue}, 100%, 50%))`;

  return (
    <Card className="shrink-0 p-4">
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Middle Hue · {value.middleHue}</Label>
          <Slider
            min={0}
            max={360}
            step={1}
            value={[value.middleHue]}
            onValueChange={([middleHue]) => onChange({ middleHue })}
          >
            <SliderTrack style={{ background: MIDDLE_HUE_RAIL }}>
              <SliderRange className="bg-transparent" />
            </SliderTrack>
            <SliderThumb aria-label="Middle Hue" />
          </Slider>
        </div>
        <hr />
        <div className="space-y-2">
          <Label>
            Hue · {value.hueFrom} … {value.hueTo}
          </Label>
          <Slider
            min={-180}
            max={180}
            step={1}
            value={[value.hueFrom, value.hueTo]}
            onValueChange={([hueFrom, hueTo]) => onChange({ hueFrom, hueTo })}
          >
            <SliderTrack style={{ background: hueRail }}>
              <SliderRange className="bg-transparent" />
            </SliderTrack>
            <SliderThumb aria-label="Hue start" />
            <SliderThumb aria-label="Hue end" />
          </Slider>
        </div>
        <hr />
        <div className="space-y-2">
          <Label>
            Luminance · {value.lumFrom} … {value.lumTo}
          </Label>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[value.lumFrom, value.lumTo]}
            onValueChange={([lumFrom, lumTo]) => onChange({ lumFrom, lumTo })}
          >
            <SliderTrack style={{ background: lumRail }}>
              <SliderRange className="bg-transparent" />
            </SliderTrack>
            <SliderThumb aria-label="Luminance start" />
            <SliderThumb aria-label="Luminance end" />
          </Slider>
        </div>
        <hr />
        <div className="flex flex-row">
          <Button variant="outline" size="sm" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}
