/**
 * Biblioteca de pegatinas vectoriales originales del editor.
 * Cada una es UNA forma de un solo color sobre un lienzo de 100 × 100: se recolorea con `layer.fill`.
 * Los "agujeros" se dibujan con sentido de giro contrario (regla de relleno no-cero).
 */

export interface Sticker {
  id: string
  name: string
  /** Datos de trazado SVG en un viewBox de 0 0 100 100. */
  path: string
  /** Color con el que se añade al lienzo. */
  defaultFill: string
}

const r = (n: number) => Math.round(n * 100) / 100

/** Polígono regular de estrella: `points` puntas entre radio exterior e interior. */
function starPath(points: number, outer: number, inner: number, rotationDeg = -90): string {
  const parts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = ((rotationDeg + (i * 180) / points) * Math.PI) / 180
    parts.push(`${i === 0 ? 'M' : 'L'}${r(50 + radius * Math.cos(angle))} ${r(50 + radius * Math.sin(angle))}`)
  }
  return `${parts.join(' ')} Z`
}

/** Elipse (sentido horario por defecto; `ccw` para hacer un agujero). */
function ellipsePath(cx: number, cy: number, rx: number, ry: number, ccw = false): string {
  const sweep = ccw ? 0 : 1
  return `M${r(cx - rx)} ${r(cy)} A${rx} ${ry} 0 1 ${sweep} ${r(cx + rx)} ${r(cy)} A${rx} ${ry} 0 1 ${sweep} ${r(cx - rx)} ${r(cy)} Z`
}

/** Franja de arcoíris: sector de corona circular entre dos radios. */
function rainbowBand(r1: number, r0: number): string {
  return `M${50 - r1} 78 A${r1} ${r1} 0 0 1 ${50 + r1} 78 L${50 + r0} 78 A${r0} ${r0} 0 0 0 ${50 - r0} 78 Z`
}

/** Rayos del sol: triángulos alrededor del disco central. */
function sunPath(): string {
  const rays: string[] = []
  const count = 10
  for (let i = 0; i < count; i++) {
    const a = ((i * 360) / count - 90) * (Math.PI / 180)
    const half = (7 * Math.PI) / 180
    const p = (ang: number, rad: number) => `${r(50 + rad * Math.cos(ang))} ${r(50 + rad * Math.sin(ang))}`
    rays.push(`M${p(a - half, 33)} L${p(a, 49)} L${p(a + half, 33)} Z`)
  }
  return `${ellipsePath(50, 50, 24, 24)} ${rays.join(' ')}`
}

/** Ola: banda ondulada generada con una senoide. */
function wavePath(): string {
  const steps = 36
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= steps; i++) {
    const x = 3 + (94 * i) / steps
    const y = 50 + 16 * Math.sin((i / steps) * Math.PI * 3)
    top.push(`${r(x)} ${r(y - 13)}`)
    bottom.push(`${r(x)} ${r(y + 13)}`)
  }
  return `M${top.join(' L')} L${bottom.reverse().join(' L')} Z`
}

/** Pata de animal: almohadilla principal y cuatro dedos. */
function pawPath(): string {
  const pad = 'M50 50 C36 50 22 64 22 77 C22 89 33 91 42 89 C47 88 53 88 58 89 C67 91 78 89 78 77 C78 64 64 50 50 50 Z'
  return [pad, ellipsePath(20, 47, 9, 12), ellipsePath(38, 26, 9.5, 13), ellipsePath(62, 26, 9.5, 13), ellipsePath(80, 47, 9, 12)].join(' ')
}

/** Flor: seis pétalos, centro y agujero central. */
function flowerPath(): string {
  const petals: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = ((i * 60 - 90) * Math.PI) / 180
    petals.push(ellipsePath(50 + 29 * Math.cos(a), 50 + 29 * Math.sin(a), 19, 19))
  }
  return `${petals.join(' ')} ${ellipsePath(50, 50, 22, 22)} ${ellipsePath(50, 50, 10, 10, true)}`
}

export const STICKERS: Sticker[] = [
  { id: 'estrella', name: 'Estrella', path: starPath(5, 48, 20), defaultFill: '#ffc93c' },
  {
    id: 'corazon',
    name: 'Corazón',
    path: 'M50 90 C46 87 6 62 6 34 C6 19 17 9 30 9 C39 9 46 14 50 21 C54 14 61 9 70 9 C83 9 94 19 94 34 C94 62 54 87 50 90 Z',
    defaultFill: '#ff4f9a',
  },
  {
    id: 'llama',
    name: 'Llama',
    path: 'M50 4 C53 22 78 34 78 62 C78 80 66 95 50 95 C34 95 22 80 22 62 C22 50 28 43 35 36 C36 46 40 50 45 50 C41 34 43 16 50 4 Z',
    defaultFill: '#ff7a3d',
  },
  { id: 'rayo', name: 'Rayo', path: 'M60 3 L16 56 L43 56 L35 97 L84 38 L56 38 Z', defaultFill: '#ffc93c' },
  {
    id: 'carita',
    name: 'Carita sonriente',
    path: `${ellipsePath(50, 50, 46, 46)} ${ellipsePath(35, 38, 6, 9, true)} ${ellipsePath(65, 38, 6, 9, true)} M22 58 Q50 92 78 58 Q50 74 22 58 Z`,
    defaultFill: '#ffc93c',
  },
  { id: 'sol', name: 'Sol', path: sunPath(), defaultFill: '#ff7a3d' },
  {
    id: 'luna',
    name: 'Luna',
    path: 'M62 5 C33 9 14 30 14 54 C14 79 35 96 60 96 C75 96 87 90 95 80 C70 84 45 69 44 45 C43 28 50 14 62 5 Z',
    defaultFill: '#7b5cff',
  },
  {
    id: 'nube',
    name: 'Nube',
    path: 'M25 80 C11 80 3 70 3 58 C3 47 11 39 21 38 C23 23 35 12 50 12 C64 12 75 21 78 35 C90 35 97 45 97 57 C97 70 88 80 76 80 Z',
    defaultFill: '#4cc9ff',
  },
  { id: 'flor', name: 'Flor', path: flowerPath(), defaultFill: '#ff4f9a' },
  {
    id: 'corona',
    name: 'Corona',
    path: 'M8 86 L8 78 L3 28 L28 50 L50 12 L72 50 L97 28 L92 78 L92 86 Z',
    defaultFill: '#ffc93c',
  },
  { id: 'huella', name: 'Huella', path: pawPath(), defaultFill: '#12c8b4' },
  { id: 'flecha', name: 'Flecha', path: 'M4 38 L57 38 L57 15 L96 50 L57 85 L57 62 L4 62 Z', defaultFill: '#7b5cff' },
  { id: 'check', name: 'Check', path: 'M6 55 L21 40 L40 59 L79 15 L94 30 L40 89 Z', defaultFill: '#12c8b4' },
  {
    id: 'bocadillo',
    name: 'Bocadillo',
    path: 'M20 10 H80 C90 10 97 17 97 27 V57 C97 67 90 74 80 74 H55 L30 94 L33 74 H20 C10 74 3 67 3 57 V27 C3 17 10 10 20 10 Z',
    defaultFill: '#4cc9ff',
  },
  { id: 'diamante', name: 'Diamante', path: 'M26 10 H74 L97 40 L50 94 L3 40 Z', defaultFill: '#7b5cff' },
  {
    id: 'destello',
    name: 'Destello',
    path: 'M50 2 C54 30 70 46 98 50 C70 54 54 70 50 98 C46 70 30 54 2 50 C30 46 46 30 50 2 Z',
    defaultFill: '#ffc93c',
  },
  { id: 'ola', name: 'Ola', path: wavePath(), defaultFill: '#12c8b4' },
  {
    id: 'arcoiris',
    name: 'Arcoíris',
    path: `${rainbowBand(48, 38)} ${rainbowBand(33, 23)} ${rainbowBand(18, 8)}`,
    defaultFill: '#ff4f9a',
  },
  { id: 'explosion', name: 'Explosión', path: starPath(12, 49, 33), defaultFill: '#ff7a3d' },
  {
    id: 'taza',
    name: 'Taza',
    path: 'M10 26 H66 V62 C66 80 56 90 38 90 C20 90 10 80 10 62 Z M66 34 H78 C94 34 94 66 78 66 H66 V57 H75 C81 57 81 43 75 43 H66 Z',
    defaultFill: '#ff4f9a',
  },
]

const BY_ID = new Map(STICKERS.map((s) => [s.id, s]))

export function getSticker(id: string): Sticker | undefined {
  return BY_ID.get(id)
}
