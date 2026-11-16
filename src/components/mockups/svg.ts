/** Pequeñas utilidades para construir SVG como texto. */

/** Redondea a 1 decimal para mantener los strings cortos. */
export function n(v: number): string {
  return String(Math.round(v * 10) / 10)
}

export type Stop = [offset: number, color: string, opacity?: number]

function stops(list: Stop[]): string {
  return list
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined && op !== 1 ? ` stop-opacity="${op}"` : ''}/>`)
    .join('')
}

/** Degradado lineal en coordenadas del lienzo. */
export function linear(id: string, x1: number, y1: number, x2: number, y2: number, list: Stop[]): string {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}">${stops(list)}</linearGradient>`
}

/** Degradado radial en coordenadas del lienzo (puede ser elíptico con `ry`). */
export function radial(id: string, cx: number, cy: number, rx: number, ry: number, list: Stop[]): string {
  const t = rx === ry ? '' : ` gradientTransform="translate(${n(cx)} ${n(cy)}) scale(1 ${n(ry / rx)}) translate(${n(-cx)} ${n(-cy)})"`
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}"${t}>${stops(list)}</radialGradient>`
}

export function clip(id: string, shape: string): string {
  return `<clipPath id="${id}">${shape}</clipPath>`
}

/** Rellenos semitransparentes de sombra y luz. */
export const dark = (op: number) => `fill="#1b1340" fill-opacity="${op}"`
export const light = (op: number) => `fill="#fff" fill-opacity="${op}"`

/** Fragmento reflejado en horizontal respecto al eje x = cx (para prendas simétricas). */
function mirrored(markup: string, cx: number): string {
  return `<g transform="matrix(-1 0 0 1 ${n(cx * 2)} 0)">${markup}</g>`
}

/** Dos mitades simétricas: la original y su reflejo. */
export function pair(markup: string, cx: number): string {
  return markup + mirrored(markup, cx)
}
