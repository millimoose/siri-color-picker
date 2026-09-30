import { memo } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '~/lib/utils';
import { copyColor } from '~/lib/copyColor';

// The only sanctioned non-token colors: text tone follows the data color's
// contrast (CIELab L* > 55 ⇒ dark text), not the theme.
const swatchVariants = cva(
  'w-full cursor-pointer rounded-md bg-(--swatch) text-left transition-shadow focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50',
  {
    variants: {
      density: {
        compact: 'flex min-h-11 items-center justify-between gap-2 px-3',
        comfortable: 'flex min-h-[76px] items-start justify-between gap-2 p-3',
      },
      tone: {
        onLight: 'text-black/87',
        onDark: 'text-white',
      },
    },
    defaultVariants: { density: 'compact' },
  },
);

export type Density = 'compact' | 'comfortable';

interface ColorSwatchProps {
  name: string;
  hex: string;
  hue: number;
  lum: number;
  density?: Density;
}

export const ColorSwatch = memo(function ColorSwatch({
  name,
  hex,
  hue,
  lum,
  density = 'compact',
}: ColorSwatchProps) {
  const tone = lum > 55 ? 'onLight' : 'onDark';
  const secondary = tone === 'onLight' ? 'text-black/62' : 'text-white/80';
  return (
    <button
      type="button"
      data-slot="color-swatch"
      className={cn(swatchVariants({ density, tone }))}
      style={
        {
          '--swatch': hex,
          contentVisibility: 'auto',
          containIntrinsicSize: density === 'compact' ? 'auto 44px' : 'auto 76px',
        } as React.CSSProperties
      }
      onClick={() => copyColor(hex)}
    >
      {density === 'compact' ? (
        <>
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="font-mono text-xs">{hex}</span>
        </>
      ) : (
        <>
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-pretty">{name}</span>
            <span className="font-mono text-sm">{hex}</span>
          </span>
          <span className={cn('text-right font-mono text-xs', secondary)}>
            H: {Math.round(hue)}°
            <br />
            L: {Math.round(lum)}
          </span>
        </>
      )}
    </button>
  );
});
