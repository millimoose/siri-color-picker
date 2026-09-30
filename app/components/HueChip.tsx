import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const hueChipVariants = cva('inline-block shrink-0 bg-(--swatch) inset-ring-1 inset-ring-border', {
  variants: {
    size: {
      dot: 'size-2.5 rounded-sm',
      bar: 'h-3 w-8 rounded-full',
    },
  },
  defaultVariants: { size: 'dot' },
});

export function HueChip({
  gradient,
  size,
  className,
}: { gradient: string; className?: string } & VariantProps<typeof hueChipVariants>) {
  return (
    <span
      data-slot="hue-chip"
      className={cn(hueChipVariants({ size }), className)}
      style={{ '--swatch': gradient } as React.CSSProperties}
    />
  );
}
