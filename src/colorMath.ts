import { ColorTranslator } from 'colortranslator';

export function hue(color: string): number {
  return new ColorTranslator(color).HSLObject.H;
}

export function lum(color: string): number {
  return new ColorTranslator(color).CIELabObject.L;
}
