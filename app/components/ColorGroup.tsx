import { Badge } from '~/components/ui/badge';
import { HueChip } from '~/components/HueChip';
import { ColorSwatch, Density } from '~/components/ColorSwatch';
import type { ColorGroup as ColorGroupData } from '~/lib/filterColors';

export function ColorGroup({ from, span, items, density }: ColorGroupData & { density: Density }) {
  const to = from + span; // unwrapped on purpose: keeps hsl() gradient stops monotonic
  const gradient = `linear-gradient(to right, hsl(${from}, 100%, 50%), hsl(${from + span / 2}, 100%, 50%), hsl(${to}, 100%, 50%))`;
  const toLabel = Math.round(to > 360 ? to - 360 : to);
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <header className="flex items-center gap-2">
        <HueChip gradient={gradient} size="bar" />
        <span className="font-mono text-xs">
          {Math.round(from)}°–{toLabel}°
        </span>
        <Badge variant="outline" className="ml-auto">
          {items.length}
        </Badge>
      </header>
      <div className={density === 'compact' ? 'flex flex-col gap-[3px]' : 'flex flex-col gap-1.5'}>
        {items.map((color) => (
          <ColorSwatch
            key={color.name}
            name={color.name}
            hex={color.hex}
            hue={color.hue}
            lum={color.lum}
            density={density}
          />
        ))}
      </div>
    </section>
  );
}
