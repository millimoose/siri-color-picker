import { Button } from '~/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '~/components/ui/empty';
import { ColorGroup } from '~/components/ColorGroup';
import type { Density } from '~/components/ColorSwatch';
import type { ColorGroup as ColorGroupData } from '~/lib/filterColors';

export function ColorResults({
  groups,
  density,
  onReset,
  className,
}: {
  groups: ColorGroupData[];
  density: Density;
  onReset: () => void;
  className?: string;
}) {
  if (groups.length === 0) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyTitle>No colors in this range</EmptyTitle>
          <EmptyDescription>
            Widen the hue window or the lightness range to see matches.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onReset}>Reset filters</Button>
        </EmptyContent>
      </Empty>
    );
  }
  // Spec's flex-[1_1_240px] wrapping row cannot produce the acceptance's
  // "three group columns at ≥1024px" (results column ≈627px < 3×240+gaps, so
  // a wrap container yields 2+1). Acceptance wins: grid, one column while
  // stacked, three from the 851px sidebar breakpoint (same as useIsStacked).
  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 min-[851px]:grid-cols-3">
        {groups.map((g) => (
          <ColorGroup key={g.from} from={g.from} span={g.span} items={g.items} density={density} />
        ))}
      </div>
    </div>
  );
}
