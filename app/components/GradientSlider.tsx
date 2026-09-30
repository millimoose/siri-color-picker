import { Badge } from '~/components/ui/badge';
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field';
import { Slider, SliderMask, SliderRange, SliderThumb, SliderTrack } from '~/components/ui/slider';

type GradientSliderProps = {
  label: React.ReactNode;
  readout: React.ReactNode;
  rail: string; // CSS gradient → --rail
  min: number;
  max: number;
  step?: number;
  value: number[]; // 1 or 2 values
  onValueChange: (v: number[]) => void;
  thumbFill: (v: number) => string; // → --fill per thumb
  thumbLabels: string[];
  scale: string[];
};

export function GradientSlider({
  label,
  readout,
  rail,
  min,
  max,
  step = 1,
  value,
  onValueChange,
  thumbFill,
  thumbLabels,
  scale,
}: GradientSliderProps) {
  const percent = (v: number) => ((v - min) / (max - min)) * 100;
  const isRange = value.length === 2;
  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        <Badge variant="value">{readout}</Badge>
      </div>
      <Slider
        size="lg"
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minStepsBetweenThumbs={0}
      >
        <SliderTrack variant="gradient" style={{ '--rail': rail } as React.CSSProperties}>
          <SliderRange variant="window" />
          {isRange && <SliderMask side="start" percent={percent(value[0])} />}
          {isRange && <SliderMask side="end" percent={100 - percent(value[1])} />}
        </SliderTrack>
        {value.map((v, i) => (
          <SliderThumb
            key={thumbLabels[i]}
            variant="swatch"
            style={{ '--fill': thumbFill(v) } as React.CSSProperties}
            aria-label={thumbLabels[i]}
          />
        ))}
      </Slider>
      <FieldDescription className="flex justify-between font-mono">
        {scale.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </FieldDescription>
    </Field>
  );
}
