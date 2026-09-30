import { toast } from 'sonner';
import { HueChip } from '~/components/HueChip';

export function copyColor(hex: string): void {
  void navigator.clipboard.writeText(hex).then(() =>
    toast(
      <span className="flex items-center gap-2">
        <HueChip gradient={hex} size="dot" className="size-[22px] rounded-full" />
        Copied <code className="font-mono">{hex}</code>
      </span>,
      { duration: 1600 },
    ),
  );
}
