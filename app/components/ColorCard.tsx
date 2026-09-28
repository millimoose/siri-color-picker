import { memo } from 'react';
import { Card } from '~/components/ui/card';

interface ColorCardProps {
  name: string;
  hex: string;
  hue: number;
  lum: number;
}

// Memoized: scrubbing the filters re-renders the grid constantly, but a given
// card's content is static, so identical props should bail out entirely.
export const ColorCard = memo(function ColorCard({ name, hex, hue, lum }: ColorCardProps) {
  // Text contrast: CIELab L* is already computed per color (colorMath.lum), so
  // derive text color from it instead of a blend hack: 55 is roughly the
  // perceptual lightness midpoint, so dark text goes on lighter cards and
  // white text on darker ones.
  const onLight = lum > 55;
  const primary = onLight ? 'text-black/85' : 'text-white';
  const secondary = onLight ? 'text-black/65' : 'text-white/80';

  return (
    <Card
      className="gap-0 p-4"
      style={{
        backgroundColor: hex,
        // Skip layout/paint for off-screen cards; ~size covers the collapsed gap.
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 140px',
      }}
    >
      <div className="space-y-1">
        <div className={`text-xl leading-tight font-medium ${primary}`}>{name}</div>
        <div className={`text-lg leading-tight ${primary}`}>{hex}</div>
        <div className={`text-sm ${secondary}`}>
          H: {Math.round(hue)}
          <br />
          L: {Math.round(lum)}
        </div>
      </div>
    </Card>
  );
});
