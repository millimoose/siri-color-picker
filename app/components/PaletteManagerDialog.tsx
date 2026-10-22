import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { copyColor } from '~/lib/copyColor';
import {
  addPalette,
  defaultPaletteName,
  deletePalette,
  hasPaletteName,
  normalizePaletteName,
  type Palette,
  type PaletteStoreState,
} from '~/lib/palettes';
import {
  extractPaletteFromFile,
  PHOTO_PALETTE_ERROR_MESSAGES,
  PhotoPaletteError,
} from '~/lib/photoPalette';

const DUPLICATE_NAME_MESSAGE = 'A palette with this name already exists.';
const EMPTY_NAME_MESSAGE = 'Enter a name.';

const STORAGE_NOTICES = {
  corrupt: "Saved palettes couldn't be read and were ignored. Saving will replace them.",
  partial: "Some saved palettes couldn't be read; they'll be discarded the next time you save.",
  unavailable: "Palettes can't be stored in this browser; they'll last until you reload.",
} as const satisfies Record<NonNullable<PaletteStoreState['error']>, string>;

type ExtractionStatus = 'idle' | 'extracting' | 'error';

interface PaletteManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  palettes: readonly Palette[];
  error: PaletteStoreState['error'];
  onSelect: (id: string) => void;
}

export function PaletteManagerDialog({
  open,
  onOpenChange,
  palettes,
  error,
  onSelect,
}: PaletteManagerDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [errorText, setErrorText] = useState('');
  const [name, setName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Palette | null>(null);
  const runId = useRef(0);

  // Object URLs are per-preview; revoke the previous one whenever it changes or
  // the manager unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetCreate = () => {
    runId.current += 1;
    setPreviewUrl(null);
    setColors([]);
    setStatus('idle');
    setErrorText('');
    setName('');
    setSaveError(null);
    setPendingDelete(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetCreate();
    onOpenChange(next);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const run = runId.current + 1;
    runId.current = run;
    setPreviewUrl(URL.createObjectURL(file));
    setName(defaultPaletteName(file.name));
    setColors([]);
    setErrorText('');
    setSaveError(null);
    setStatus('extracting');

    try {
      const extracted = await extractPaletteFromFile(file);
      if (runId.current !== run) return;
      setColors(extracted);
      setStatus('idle');
    } catch (extractionError) {
      if (runId.current !== run) return;
      setColors([]);
      setErrorText(
        extractionError instanceof PhotoPaletteError
          ? extractionError.message
          : PHOTO_PALETTE_ERROR_MESSAGES['decode-failed'],
      );
      setStatus('error');
    }
  };

  const normalizedName = normalizePaletteName(name);
  const duplicateName = hasPaletteName(palettes, name);
  const nameError =
    saveError ??
    (duplicateName
      ? DUPLICATE_NAME_MESSAGE
      : name.length > 0 && normalizedName === null
        ? EMPTY_NAME_MESSAGE
        : null);
  const canSave =
    status !== 'extracting' && colors.length > 0 && normalizedName !== null && !duplicateName;

  const handleSave = () => {
    const result = addPalette({ name, colors });
    if (!result.ok) {
      setSaveError(
        result.reason === 'duplicate-name' ? DUPLICATE_NAME_MESSAGE : EMPTY_NAME_MESSAGE,
      );
      return;
    }
    handleOpenChange(false);
    onSelect(result.palette.id);
    if (result.persisted) {
      toast(`Saved “${result.palette.name}”`);
    } else {
      toast.warning('Saved for this session only — storage is unavailable.');
    }
  };

  const handleDelete = () => {
    if (pendingDelete === null) return;
    const palette = pendingDelete;
    setPendingDelete(null);
    const persisted = deletePalette(palette.id);
    if (persisted) {
      toast(`Deleted “${palette.name}”`);
    } else {
      toast.warning(`Deleted “${palette.name}” for this session only.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Palettes</DialogTitle>
          <DialogDescription>
            Create a palette from a photo. Processing happens here; the image is never uploaded.
          </DialogDescription>
        </DialogHeader>

        {error !== null && (
          <p role="status" className="text-xs text-muted-foreground">
            {STORAGE_NOTICES[error]}
          </p>
        )}

        <section className="flex flex-col gap-2">
          <Label htmlFor="palette-photo">Photo</Label>
          <Input
            id="palette-photo"
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={status === 'extracting'}
          />
          {previewUrl !== null && (
            <img
              src={previewUrl}
              alt="Selected image preview"
              className="max-h-40 rounded-md object-contain"
            />
          )}
          {status === 'extracting' && <p role="status">Extracting colors…</p>}
          {status === 'error' && (
            <p role="alert" className="text-destructive">
              {errorText}
            </p>
          )}
          {colors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {colors.map((hex) => (
                <div key={hex} className="flex w-12 flex-col gap-1">
                  <button
                    type="button"
                    aria-label={`Copy ${hex}`}
                    className="size-12 cursor-pointer rounded-md ring-1 ring-foreground/10"
                    style={{ backgroundColor: hex }}
                    onClick={() => copyColor(hex)}
                  />
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {hex}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Label htmlFor="palette-name">Name</Label>
          <Input
            id="palette-name"
            maxLength={40}
            value={name}
            aria-invalid={nameError !== null}
            onChange={(event) => {
              setName(event.target.value);
              setSaveError(null);
            }}
          />
          {nameError !== null && (
            <p role="alert" className="text-xs text-destructive">
              {nameError}
            </p>
          )}
          <DialogFooter>
            <Button onClick={handleSave} disabled={!canSave}>
              Save palette
            </Button>
          </DialogFooter>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Saved palettes</h2>
          {palettes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No saved palettes yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {palettes.map((palette) => (
                <li
                  key={palette.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border p-2"
                >
                  <span className="flex gap-0.5" aria-hidden="true">
                    {palette.colors.map((hex) => (
                      <span
                        key={hex}
                        className="size-4 rounded-sm ring-1 ring-foreground/10"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {palette.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {palette.colors.length} colors
                  </span>
                  <Button
                    size="sm"
                    aria-label={`Use “${palette.name}”`}
                    onClick={() => {
                      onSelect(palette.id);
                      handleOpenChange(false);
                    }}
                  >
                    Use
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete “${palette.name}”`}
                    onClick={() => setPendingDelete(palette)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AlertDialog
          open={pendingDelete !== null}
          onOpenChange={(next) => {
            if (!next) setPendingDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
              <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
