/** Constantes del personalizador. */

/** Resolución objetivo de los archivos de impresión (ppp / dpi). */
export const PRINT_DPI = 300
export const MIN_PRINT_DPI = 150
/** Límite de píxeles de un archivo de impresión (los canvas de iOS fallan por encima de ~16,7 M). */
export const MAX_PRINT_PIXELS = 16_000_000
/** Ancho en píxeles de las vistas previas del producto. */
export const PREVIEW_WIDTH_PX = 900

/** Tolerancia de imán a los ejes de la zona, en cm. */
export const SNAP_TOLERANCE_CM = 0.4
export const NUDGE_CM = 0.1
export const NUDGE_BIG_CM = 1
export const MIN_LAYER_CM = 0.5
export const MAX_HISTORY = 100

/** Resolución efectiva (ppp) por debajo de la cual avisamos y a partir de la cual es buena. */
export const LOW_DPI = 150
export const GOOD_DPI = 200

/** Lado máximo (px) con el que se muestran en pantalla las imágenes subidas. */
export const DISPLAY_MAX_SIDE_PX = 2048

export const DRAFT_PREFIX = 'pieza-unica-draft-'

/** Paleta de colores "pop" para textos y pegatinas. */
export const PALETTE: { hex: string; name: string }[] = [
  { hex: '#1b1340', name: 'Tinta' },
  { hex: '#ffffff', name: 'Blanco' },
  { hex: '#ff4f9a', name: 'Rosa' },
  { hex: '#c81e68', name: 'Fucsia' },
  { hex: '#ff7a3d', name: 'Naranja' },
  { hex: '#ffc93c', name: 'Amarillo' },
  { hex: '#12c8b4', name: 'Turquesa' },
  { hex: '#2e9e4f', name: 'Verde' },
  { hex: '#4cc9ff', name: 'Celeste' },
  { hex: '#2b59e8', name: 'Azul' },
  { hex: '#7b5cff', name: 'Violeta' },
  { hex: '#dd2a3c', name: 'Rojo' },
]
