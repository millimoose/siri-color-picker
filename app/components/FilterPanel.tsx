import { useState } from 'react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { GradientSlider } from '~/components/GradientSlider';
import { HueChip } from '~/components/HueChip';
import { ColorFilters, DEFAULT_FILTERS } from '~/lib/filterColors';
import { useIsStacked } from '~/lib/useIsStacked';

// Real minus U+2212 for negatives, '+' for positives, bare 0.
const signed = (deg: number) => (deg > 0 ? `+${deg}` : deg < 0 ? `−${Math.abs(deg)}` : '0');

interface FilterPanelProps {
  value: ColorFilters;
  onChange: (patch: Partial<ColorFilters>) => void;
  onReset: () => void;
}

export function FilterPanel({ value, onChange, onReset }: FilterPanelProps) {
  const isStacked = useIsStacked();
  const [open, setOpen] = useState(true);
  const isDefault =
    value.middleHue === DEFAULT_FILTERS.middleHue &&
    value.hueFrom === DEFAULT_FILTERS.hueFrom &&
    value.hueTo === DEFAULT_FILTERS.hueTo &&
    value.lumFrom === DEFAULT_FILTERS.lumFrom &&
    value.lumTo === DEFAULT_FILTERS.lumTo;
  const mid = value.middleHue;
  const hueRail = `linear-gradient(to right, ${[0, 1, 2, 3, 4]
    .map((idx) => `hsl(${mid + idx * 90 - 180}, 100%, 50%)`)
    .join(', ')})`;
  const lumRail = `linear-gradient(to right, hsl(${mid}, 100%, 0%), hsl(${mid}, 100%, 50%), hsl(${mid}, 100%, 100%))`;
  const summary = `H ${mid}° · ${signed(value.hueFrom)}…${signed(value.hueTo)} · L ${value.lumFrom}–${value.lumTo}`;

  return (
    <Collapsible open={isStacked ? open : true} onOpenChange={setOpen}>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          {isStacked && !open && <CardDescription>{summary}</CardDescription>}
          <CardAction className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onReset} disabled={isDefault}>
              Reset
            </Button>
            {isStacked && (
              <CollapsibleTrigger asChild>
                <Button size="sm">{open ? 'Hide' : 'Adjust'}</Button>
              </CollapsibleTrigger>
            )}
          </CardAction>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-5">
            <GradientSlider
              label="Middle hue"
              readout={
                <>
                  <HueChip gradient={`hsl(${mid}, 100%, 50%)`} size="dot" /> {mid}°
                </>
              }
              rail={`linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
                .map((h) => `hsl(${h}, 100%, 50%)`)
                .join(', ')})`}
              min={0}
              max={360}
              value={[mid]}
              onValueChange={([middleHue]) => onChange({ middleHue })}
              thumbFill={() => `hsl(${mid}, 100%, 50%)`}
              thumbLabels={['Middle hue']}
              scale={['0°', '180°', '360°']}
            />
            <GradientSlider
              label="Hue window"
              readout={`${signed(value.hueFrom)}° … ${signed(value.hueTo)}°`}
              rail={hueRail}
              min={-180}
              max={180}
              value={[value.hueFrom, value.hueTo]}
              onValueChange={([hueFrom, hueTo]) => onChange({ hueFrom, hueTo })}
              thumbFill={(v) => `hsl(${mid + v}, 100%, 50%)`}
              thumbLabels={['Hue window start', 'Hue window end']}
              scale={['−180°', `0 = ${mid}°`, '+180°']}
            />
            <GradientSlider
              label={
                <>
                  Lightness L<sup>*</sup>
                </>
              }
              readout={`${value.lumFrom} … ${value.lumTo}`}
              rail={lumRail}
              min={0}
              max={100}
              value={[value.lumFrom, value.lumTo]}
              onValueChange={([lumFrom, lumTo]) => onChange({ lumFrom, lumTo })}
              thumbFill={(v) => `hsl(${mid}, 100%, ${v}%)`}
              thumbLabels={['Lightness start', 'Lightness end']}
              scale={['0 dark', 'light 100']}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
