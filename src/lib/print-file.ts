/**
 * Tamaño de los archivos de impresión (PNG recortado a la caja del arte, a 300 ppp).
 * Lo comparten el editor (que los genera) y el servidor (que comprueba que el archivo adjunto a un
 * pedido se corresponde con la superficie que se cobra: si no, un cliente podría declarar una capa
 * diminuta —precio mínimo— y adjuntar un PNG que ocupe toda la zona).
 */
import { MAX_PRINT_PIXELS, MIN_PRINT_DPI, PRINT_DPI } from './editor/constants'
import { CM_PER_INCH } from './editor/geometry'

export interface PrintRenderSize {
  dpi: number
  widthPx: number
  heightPx: number
}

/** Píxeles de una caja de `wCm × hCm` renderizada a `dpi` ppp. */
export function printRenderSizeAt(wCm: number, hCm: number, dpi: number): PrintRenderSize {
  const ppc = dpi / CM_PER_INCH
  return { dpi, widthPx: Math.max(1, Math.ceil(wCm * ppc)), heightPx: Math.max(1, Math.ceil(hCm * ppc)) }
}

/** Píxeles del archivo de impresión para una caja de `wCm × hCm` (baja los ppp si pasaría del tope de píxeles). */
export function printRenderSize(wCm: number, hCm: number): PrintRenderSize {
  let dpi = PRINT_DPI
  if (wCm * hCm * (dpi / CM_PER_INCH) ** 2 > MAX_PRINT_PIXELS) {
    dpi = Math.max(MIN_PRINT_DPI, Math.floor(CM_PER_INCH * Math.sqrt(MAX_PRINT_PIXELS / (wCm * hCm))))
  }
  return printRenderSizeAt(wCm, hCm, dpi)
}

/**
 * ¿Las dimensiones reales del PNG corresponden a la caja declarada? Se admite cualquier resolución uniforme
 * entre `MIN_PRINT_DPI` y la que correspondería a 300 ppp (el editor baja los ppp cuando una foto grande haría
 * el PNG demasiado pesado para subirlo). Tolerancia por eje: 2 px o el 1,5 %.
 */
export function printFileMatchesBox(actual: { width: number; height: number }, wCm: number, hCm: number): boolean {
  const maxDpi = printRenderSize(wCm, hCm).dpi
  const dpi = Math.min(maxDpi, Math.max(MIN_PRINT_DPI, (actual.width * CM_PER_INCH) / wCm))
  const expected = printRenderSizeAt(wCm, hCm, dpi)
  const close = (got: number, want: number) => Math.abs(got - want) <= Math.max(2, want * 0.015)
  return close(actual.width, expected.widthPx) && close(actual.height, expected.heightPx)
}
