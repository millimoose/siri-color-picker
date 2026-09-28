import * as React from 'react';
import { cn } from '~/lib/utils';
import { Slider as SliderPrimitive } from 'radix-ui';

// Composite API (Root/Track/Range/Thumb) instead of the one-shot <Slider>:
// the app paints hue/luminance gradients onto the track via inline style, which
// requires rendering the Track element itself. Class sets mirror shadcn's
// generated slider, minus vertical-orientation rules (unused here).

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function SliderTrack({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Track>) {
  return (
    <SliderPrimitive.Track
      data-slot="slider-track"
      className={cn(
        'relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full',
        className,
      )}
      {...props}
    />
  );
}

function SliderRange({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Range>) {
  return (
    <SliderPrimitive.Range
      data-slot="slider-range"
      className={cn('absolute bg-primary data-[orientation=horizontal]:h-full', className)}
      {...props}
    />
  );
}

function SliderThumb({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Thumb>) {
  return (
    <SliderPrimitive.Thumb
      data-slot="slider-thumb"
      className={cn(
        'block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Slider, SliderTrack, SliderRange, SliderThumb };
