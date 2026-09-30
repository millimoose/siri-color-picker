import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';
import { Slider as SliderPrimitive } from 'radix-ui';

// Composite API (Root/Track/Range/Thumb): the app paints hue/luminance
// gradients onto the track via the --rail CSS var, which requires rendering
// the Track element itself. Size propagates through data-size on the Root.

const sliderVariants = cva(
  'group/slider relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50',
  {
    variants: {
      size: {
        default: '',
        // 44px touch target; half-thumb inline padding so edge thumbs are not
        // clipped (Track compensates with -mx-3.5 to stay aligned with the
        // Radix value mapping, which is computed against the Root box).
        lg: 'h-11 px-3.5',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

const sliderTrackVariants = cva('relative grow rounded-full data-[orientation=horizontal]:w-full', {
  variants: {
    size: {
      default: 'overflow-hidden data-[orientation=horizontal]:h-1.5',
      lg: '-mx-3.5 overflow-visible data-[orientation=horizontal]:h-4 inset-ring-1 inset-ring-border',
    },
    variant: {
      default: 'bg-muted',
      gradient: 'bg-(--rail)',
    },
  },
  defaultVariants: { size: 'default', variant: 'default' },
});

const sliderRangeVariants = cva('absolute data-[orientation=horizontal]:h-full', {
  variants: {
    variant: {
      fill: 'bg-primary',
      // Transparent outline over a gradient rail: marks the selected window
      // without painting over the rail. Extends 3px past the track vertically
      // (h-auto lets the inset-y offsets win over the base h-full).
      window:
        'pointer-events-none -inset-y-[3px] h-auto rounded-full bg-transparent ring-2 ring-primary',
    },
  },
  defaultVariants: { variant: 'fill' },
});

const sliderThumbVariants = cva(
  'block shrink-0 rounded-full transition-[color,box-shadow] focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        default:
          'size-4 border border-primary bg-white shadow-sm ring-ring/50 hover:ring-4 focus-visible:ring-4',
        lg: 'size-7 cursor-grab border-[3px] border-background shadow-md ring-1 ring-foreground/15 focus-visible:ring-[6px] focus-visible:ring-ring/50',
      },
      variant: {
        default: '',
        swatch: 'bg-(--fill)',
      },
    },
    defaultVariants: { size: 'default', variant: 'default' },
  },
);

function Slider({
  className,
  size,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & VariantProps<typeof sliderVariants>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      data-size={size ?? 'default'}
      className={cn(sliderVariants({ size }), className)}
      {...props}
    />
  );
}

function SliderTrack({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Track> & VariantProps<typeof sliderTrackVariants>) {
  return (
    <SliderPrimitive.Track
      data-slot="slider-track"
      className={cn(
        sliderTrackVariants({ variant }),
        'group-data-[size=lg]/slider:-mx-3.5 group-data-[size=lg]/slider:overflow-visible group-data-[size=lg]/slider:data-[orientation=horizontal]:h-4 group-data-[size=lg]/slider:inset-ring-1 group-data-[size=lg]/slider:inset-ring-border',
        className,
      )}
      {...props}
    />
  );
}

function SliderRange({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Range> & VariantProps<typeof sliderRangeVariants>) {
  return (
    <SliderPrimitive.Range
      data-slot="slider-range"
      className={cn(sliderRangeVariants({ variant }), className)}
      {...props}
    />
  );
}

function SliderThumb({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Thumb> & VariantProps<typeof sliderThumbVariants>) {
  return (
    <SliderPrimitive.Thumb
      data-slot="slider-thumb"
      className={cn(
        sliderThumbVariants({ variant }),
        'group-data-[size=lg]/slider:size-7 group-data-[size=lg]/slider:cursor-grab group-data-[size=lg]/slider:border-[3px] group-data-[size=lg]/slider:border-background group-data-[size=lg]/slider:shadow-md group-data-[size=lg]/slider:ring-1 group-data-[size=lg]/slider:ring-foreground/15 group-data-[size=lg]/slider:focus-visible:ring-[6px] group-data-[size=lg]/slider:focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    />
  );
}

// Dimming overlay for track regions outside the selected range of a range
// slider. percent is the width of the masked region as a % of the track.
function SliderMask({
  side,
  percent,
  className,
}: {
  side: 'start' | 'end';
  percent: number;
  className?: string;
}) {
  return (
    <span
      data-slot="slider-mask"
      aria-hidden
      className={cn(
        'absolute inset-y-0 bg-background/75',
        side === 'start' ? 'start-0 rounded-s-full' : 'end-0 rounded-e-full',
        className,
      )}
      style={{ width: `${percent}%` }}
    />
  );
}

export { Slider, SliderTrack, SliderRange, SliderThumb, SliderMask };
