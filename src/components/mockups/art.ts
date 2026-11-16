import type { ProductView } from '@/config/products'
import { INK } from './color'
import { clip, n } from './svg'

/**
 * Diseños de ejemplo para las vistas de escaparate: formas SVG puras en la paleta pop
 * (sin texto, sin marcas). Cada uno se dibuja centrado en el origen dentro de una caja de 100 × 100.
 */

const PINK = '#ff4f9a'
const PINK_SOFT = '#ff8fc1'
const YELLOW = '#ffc93c'
const TEAL = '#12c8b4'
const VIOLET = '#7b5cff'
const ORANGE = '#ff7a3d'
const SKY = '#4cc9ff'
const CREAM = '#fff8ec'

/** Todos los motivos heredan el trazo de tinta del grupo raíz; solo se indica el grosor cuando cambia. */
const sw = (w: number) => `stroke-width="${w}"`
const NO_STROKE = 'stroke="none"'

function star(r: number, ri: number, points = 5, rot = -90): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = ((rot + (i * 180) / points) * Math.PI) / 180
    const rad = i % 2 === 0 ? r : ri
    pts.push(`${n(Math.cos(a) * rad)} ${n(Math.sin(a) * rad)}`)
  }
  return `M${pts.join('L')}Z`
}

const sparkle = (s: number) =>
  `M0 ${-s}Q${n(s * 0.18)} ${n(-s * 0.18)} ${s} 0Q${n(s * 0.18)} ${n(s * 0.18)} 0 ${s}Q${n(-s * 0.18)} ${n(s * 0.18)} ${-s} 0Q${n(-s * 0.18)} ${n(-s * 0.18)} 0 ${-s}Z`

/** Rayos del sol: triángulos alrededor del centro, calculados en coordenadas absolutas. */
function rays(long: boolean): string {
  let d = ''
  for (let i = long ? 0 : 1; i < 12; i += 2) {
    const a = (i * 30 * Math.PI) / 180
    const p = (r: number, off: number) => `${n(Math.cos(a + off) * r)} ${n(Math.sin(a + off) * r)}`
    d += `M${p(27, -0.21)}L${p(long ? 47 : 41, 0)}L${p(27, 0.21)}Z`
  }
  return d
}

function sun(): string {
  return (
    `<path d="${rays(true)}" fill="${ORANGE}"/><path d="${rays(false)}" fill="${PINK}"/>` +
    `<circle r="26" fill="${YELLOW}" ${sw(3)}/>` +
    `<circle cx="-9" cy="-4" r="2.6" fill="${INK}" ${NO_STROKE}/><circle cx="9" cy="-4" r="2.6" fill="${INK}" ${NO_STROKE}/>` +
    `<path d="M-9 6Q0 16 9 6" fill="none" ${sw(2.8)}/>` +
    `<circle cx="-16" cy="6" r="4.4" fill="${PINK}" fill-opacity=".75" ${NO_STROKE}/><circle cx="16" cy="6" r="4.4" fill="${PINK}" fill-opacity=".75" ${NO_STROKE}/>`
  )
}

function badge(): string {
  return (
    `<circle r="46" fill="${VIOLET}" ${sw(3)}/>` +
    `<circle r="39.5" fill="none" stroke="${YELLOW}" stroke-width="3.4" stroke-dasharray="0.1 6.4"/>` +
    `<circle r="31" fill="${CREAM}" ${sw(3)}/>` +
    `<path d="${star(21, 9)}" transform="translate(0 -2)" fill="${PINK}" ${sw(2.8)}/>` +
    [-22, 22].map((x) => `<path d="${star(7, 3)}" transform="translate(${x} 19)" fill="${YELLOW}" ${sw(2)}/>`).join('') +
    `<path d="M-14 24Q0 31 14 24" fill="none"/>`
  )
}

function sunset(uid: string): string {
  const wave = (y: number, color: string) => `<path d="M-46 ${y}Q-35 ${y - 8} -23 ${y}T0 ${y}T23 ${y}T46 ${y}V46H-46Z" fill="${color}"/>`
  return (
    clip(`${uid}-w`, '<circle r="43"/>') +
    `<g clip-path="url(#${uid}-w)"><rect x="-44" y="-44" width="88" height="88" fill="${VIOLET}" ${NO_STROKE}/>` +
    `<circle cy="-8" r="27" fill="${YELLOW}" ${sw(2.6)}/>` +
    [2, 9, 16].map((y, i) => `<rect x="-30" y="${y}" width="60" height="${2.2 + i * 1.6}" fill="${VIOLET}" ${NO_STROKE}/>`).join('') +
    wave(18, TEAL) +
    wave(29, SKY) +
    wave(40, PINK) +
    `</g><circle r="43" fill="none" ${sw(3)}/>`
  )
}

function blobs(): string {
  return (
    `<path d="M-32 -8C-36 -30-8 -42 8 -31C23 -21 30 -3 14 6C2 12-8 24-23 15C-35 8-29 1-32 -8Z" fill="${PINK}" ${sw(2.8)}/>` +
    `<path d="M5 3C13 -9 34 -5 39 12C43 29 25 43 8 37C-5 33-7 12 5 3Z" fill="${TEAL}" ${sw(2.8)}/>` +
    `<circle cx="-22" cy="27" r="12" fill="${YELLOW}" ${sw(2.8)}/>` +
    `<path d="${sparkle(9)}" transform="translate(-33 -33)" fill="${YELLOW}" ${sw(2)}/>` +
    `<path d="${sparkle(6)}" transform="translate(37 -26)" fill="${VIOLET}" ${sw(2)}/>` +
    `<circle cx="22" cy="-8" r="3.2" fill="${CREAM}" ${sw(2)}/><circle cx="-8" cy="-14" r="3.2" fill="${CREAM}" ${sw(2)}/><circle cx="22" cy="26" r="2.4" fill="${INK}" ${NO_STROKE}/>`
  )
}

function rainbow(): string {
  const arcs: [number, string][] = [
    [44, PINK],
    [36, ORANGE],
    [28, YELLOW],
    [20, TEAL],
    [12, VIOLET],
  ]
  const cloud = (x: number) =>
    `<path d="M${x - 14} 21C${x - 22} 21 ${x - 22} 8 ${x - 11} 8C${x - 9} -1 ${x + 6} -1 ${x + 8} 8C${x + 20} 8 ${x + 20} 21 ${x + 10} 21Z" fill="${CREAM}" ${sw(2.6)}/>`
  return (
    `<g transform="translate(0 7)">` +
    arcs.map(([r, c]) => `<path d="M${-r} 16A${r} ${n(r * 1.18)} 0 0 1 ${r} 16Z" fill="${c}"/>`).join('') +
    cloud(-34) +
    cloud(34) +
    `<path d="${sparkle(6)}" transform="translate(0 -34)" fill="${YELLOW}" ${sw(1.8)}/>` +
    `</g>`
  )
}

function flower(): string {
  let petals = ''
  for (let i = 0; i < 8; i++) {
    petals += `<ellipse cy="-26" rx="11" ry="19" transform="rotate(${i * 45})" fill="${i % 2 ? PINK_SOFT : PINK}" ${sw(2.6)}/>`
  }
  return (
    petals +
    `<circle r="15" fill="${YELLOW}" ${sw(3)}/>` +
    [
      [-5, -4],
      [5, -4],
      [0, 5],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${ORANGE}" ${NO_STROKE}/>`)
      .join('')
  )
}

const MOTIFS: ((uid: string) => string)[] = [sun, badge, sunset, blobs, rainbow, flower]

/** Número de diseños de ejemplo disponibles. */
export const SAMPLE_ART_VARIANTS = MOTIFS.length

export function motif(variant: number, uid: string): string {
  const i = ((Math.floor(variant) % MOTIFS.length) + MOTIFS.length) % MOTIFS.length
  return `<g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${MOTIFS[i](`${uid}-m${i}`)}</g>`
}

interface Box {
  cx: number
  cy: number
  w: number
  h: number
}

/** Diseño de ejemplo recortado a un rectángulo (centro y tamaño en unidades del lienzo). */
export function artInBox(variant: number, uid: string, box: Box, id: string): string {
  const { cx, cy, w, h } = box
  const place = (x: number, y: number, size: number, rot = 0, suffix = '') =>
    `<g transform="translate(${n(x)} ${n(y)})${rot ? ` rotate(${rot})` : ''} scale(${n(size / 100)})">${motif(variant, uid + suffix)}</g>`
  const size = Math.min(w, h) * 0.94
  let content = place(cx, cy, size)
  if (w / h >= 2) {
    // franja larga (taza): el motivo se repite más pequeño a los lados
    content =
      place(cx - w * 0.3, cy, size * 0.66, -8, 'l') +
      place(cx + w * 0.3, cy, size * 0.66, 8, 'r') +
      content
  }
  const cid = `${uid}-clip-${id}`
  return `${clip(cid, `<rect x="${n(cx - w / 2)}" y="${n(cy - h / 2)}" width="${n(w)}" height="${n(h)}"/>`)}<g clip-path="url(#${cid})">${content}</g>`
}

/** La zona más grande de la vista: la que lleva el diseño de ejemplo. */
export function mainArea(view: ProductView) {
  return view.areas.reduce((a, b) => (a.widthCm * a.heightCm >= b.widthCm * b.heightCm ? a : b))
}
