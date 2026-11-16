/** Utilidades de color para los mockups. Todo opera sobre hex "#rrggbb". */

export const INK = '#1b1340'
export const PAPER = '#ffffff'

/** Devuelve "#rrggbb" en minúsculas; si la entrada no es un hex válido, blanco. */
export function normalizeHex(input: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim())
  if (!m) return PAPER
  let h = m[1].toLowerCase()
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  return `#${h}`
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Mezcla `a` con `b`; t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${[c(ar, br), c(ag, bg), c(ab, bb)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Luminancia relativa WCAG (0 negro, 1 blanco). */
export function luminance(hex: string): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = channels(hex)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Tono de una prenda: decide cuánta sombra y cuánta luz hacen falta para que el volumen se lea
 * igual de bien sobre blanco que sobre negro (a las prendas claras se les da más sombra y a las
 * oscuras más luz). Las capas de sombra/luz son siempre negro/blanco semitransparentes.
 */
export interface Tone {
  hex: string
  lum: number
  /** Opacidad de una capa de sombra, escalada según el color base. */
  shade: (base: number) => number
  /** Opacidad de una capa de luz, escalada según el color base. */
  light: (base: number) => number
  /** Color de las costuras (punteado) y su opacidad. */
  seam: string
  seamOpacity: number
}

export function toneOf(hex: string): Tone {
  const lum = luminance(hex)
  const dark = lum < 0.12
  return {
    hex,
    lum,
    shade: (base) => clamp(base * (0.5 + 1.1 * Math.sqrt(lum)), 0.02, 0.5),
    light: (base) => clamp(base * (1.7 - 1.3 * Math.sqrt(lum)), 0.02, 0.6),
    seam: lum > 0.28 ? INK : PAPER,
    seamOpacity: dark ? 0.4 : lum > 0.28 ? 0.34 : 0.42,
  }
}
