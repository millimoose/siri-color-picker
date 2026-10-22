import { ImagePlus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { COLOR_ITEMS } from '~/lib/filterColors';
import type { Palette } from '~/lib/palettes';

interface PaletteSourceBarProps {
  palettes: readonly Palette[];
  value: string; // 'named' or a palette id
  onChange: (value: string) => void;
  onFromPhoto: () => void;
}

export function PaletteSourceBar({
  palettes,
  value,
  onChange,
  onFromPhoto,
}: PaletteSourceBarProps) {
  // Radix only learns the selected item's text once its content has mounted, so
  // render the label from state instead of leaving the trigger blank on load.
  const active = palettes.find((palette) => palette.id === value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="color-source">Colors</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="color-source" className="min-w-48">
          <SelectValue>
            {active
              ? `${active.name} (${active.colors.length})`
              : `Named colors (${COLOR_ITEMS.length})`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="named">Named colors ({COLOR_ITEMS.length})</SelectItem>
          {palettes.map((palette) => (
            <SelectItem key={palette.id} value={palette.id}>
              {palette.name} ({palette.colors.length})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onFromPhoto}>
        <ImagePlus />
        From photo
      </Button>
    </div>
  );
}
