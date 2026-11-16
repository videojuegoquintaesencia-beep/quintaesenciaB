import { INK } from './color'
import { symmetric, type Seg } from './geom'
import { clip, dark, light, linear, n, pair } from './svg'
import type { Built, Ctx } from './types'

const CX = 320

/**
 * Cuerpo y mangas (sin capucha). Mitad izquierda desde el cuello hasta el centro del bajo.
 * Las mangas cuelgan algo abiertas, dejando una cuña de fondo entre manga y costado.
 */
const SIDE: Seg[] = [
  ['Q', 188, 188, 134, 206], // hombro caído
  ['C', 108, 310, 76, 500, 42, 652], // borde exterior de la manga
  ['L', 100, 666], // puño
  ['C', 112, 570, 126, 450, 134, 352], // borde interior de la manga hasta la axila
  ['C', 133, 460, 132, 550, 132, 624], // costado
  ['L', 143, 627], // el cuerpo se recoge en el elástico
  ['L', 143, 668],
  ['Q', 230, 673, 320, 673], // bajo
]

const outline = (w = 3) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`
const thin = (op: number, w = 2) => `fill="none" stroke="${INK}" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`

/** Tejido acanalado: el elástico del bajo es una raya gruesa y discontinua; el del puño, líneas siguiendo la manga. */
const cuffRibs = () => {
  let d = ''
  for (let i = 1; i < 7; i++) {
    const t = i / 7
    d += `M${n(49 + 58 * t)} ${n(613 + 14 * t)}L${n(42 + 58 * t)} ${n(652 + 14 * t)}`
  }
  return d
}

function build(ctx: Ctx, back: boolean): Built {
  const { uid, hex, tone: t, view } = ctx
  const { width, height } = view.viewBox
  const sil = symmetric([240, 178], SIDE, CX, 'Z')

  const hoodFront = 'M228 196C214 130 240 56 320 52C400 56 426 130 412 196C404 238 364 268 320 272C276 268 236 238 228 196Z'
  const opening = 'M256 182C246 126 270 80 320 78C370 80 394 126 384 182C376 214 350 236 320 242C290 236 264 214 256 182Z'
  const rimStitch = 'M246 186C234 122 264 64 320 62C376 64 406 122 394 186C386 226 356 252 320 258C284 252 254 226 246 186Z'
  const hoodRear = 'M218 204C198 124 236 44 320 40C404 44 442 124 422 204C396 234 352 242 320 242C288 242 244 234 218 204Z'
  const pocketPath = 'M236 500Q320 506 404 500L452 626Q320 636 188 626Z'

  const defs =
    clip(`${uid}-sil`, `<path d="${sil}"/>`) +
    linear(`${uid}-side`, 134, 0, 506, 0, [
      [0, '#1b1340', t.shade(0.2)],
      [0.1, '#1b1340', t.shade(0.07)],
      [0.24, '#1b1340', 0],
      [0.76, '#1b1340', 0],
      [0.9, '#1b1340', t.shade(0.07)],
      [1, '#1b1340', t.shade(0.2)],
    ]) +
    linear(`${uid}-tilt`, 110, 100, 520, 680, [
      [0, '#fff', t.light(0.14)],
      [0.5, '#fff', 0],
      [1, '#1b1340', t.shade(0.1)],
    ]) +
    // manga: sombra en los bordes y algo de luz en el centro, siguiendo el eje de la manga
    linear(`${uid}-slv`, 70, 500, 126, 510, [
      [0, '#1b1340', t.shade(0.16)],
      [0.4, '#fff', t.light(0.08)],
      [0.75, '#1b1340', 0],
      [1, '#1b1340', t.shade(0.14)],
    ]) +
    linear(`${uid}-hood`, 240, 40, 400, 240, [
      [0, '#fff', t.light(0.16)],
      [0.55, '#fff', 0],
      [1, '#1b1340', t.shade(0.12)],
    ]) +
    linear(`${uid}-in`, 0, 76, 0, 244, [
      [0, '#1b1340', t.shade(0.62)],
      [1, '#1b1340', t.shade(0.4)],
    ])

  const dash = `fill="none" stroke="${t.seam}" stroke-opacity="${t.seamOpacity}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linecap="round"`

  const half =
    `<path d="M134 206C108 310 76 500 42 652L100 666C112 570 126 450 134 352C140 300 140 250 134 206Z" fill="url(#${uid}-slv)"/>` +
    `<path d="M134 352C126 450 112 570 100 666L116 668C130 590 144 470 152 400C156 370 154 350 150 340Z" ${dark(t.shade(0.1))}/>` +
    // arrugas del codo
    `<path d="M72 450C84 460 100 462 112 454C100 470 80 470 72 450Z" ${dark(t.shade(0.13))}/>` +
    `<path d="M62 505C76 515 94 517 108 509C94 527 70 527 62 505Z" ${dark(t.shade(0.11))}/>` +
    // elásticos de puño y bajo
    `<path d="M42 652L100 666L107 627L49 613Z" ${dark(t.shade(0.1))}/>` +
    `<path d="M143 627Q230 631 320 631V673Q230 673 143 668Z" ${dark(t.shade(0.1))}/>` +
    // pliegues del torso y arrugas sobre el elástico
    `<path d="M140 372C168 410 180 480 174 566C164 500 152 430 140 372Z" ${dark(t.shade(0.09))}/>` +
    `<path d="M152 380C176 420 188 480 184 540C198 486 178 424 152 380Z" ${light(t.light(0.09))}/>` +
    `<path d="M150 606C170 598 190 616 214 608C196 624 168 620 150 606Z" ${dark(t.shade(0.1))}/>`

  const ribs =
    `<path d="M152 651H316" fill="none" stroke="${INK}" stroke-opacity=".16" stroke-width="38" stroke-dasharray="1.6 7.4"/>` +
    `<path d="${cuffRibs()}" ${thin(0.16, 1.6)}/>`
  const seams =
    `<path d="M134 206C150 260 148 320 134 352" ${thin(0.5)}/><path d="M49 640L103 653" ${dash}/>` +
    `<path d="M147 638Q230 642 320 642" ${dash}/>`

  // bolsillo canguro: aberturas inclinadas a los lados
  const pocket = back
    ? ''
    : `<path d="${pocketPath}" fill="${hex}"/>` +
      `<path d="${pocketPath}" ${dark(t.shade(0.05))}/>` +
      `<path d="M236 500L188 626M404 500L452 626" fill="none" stroke="#1b1340" stroke-opacity=".3" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M243 508L197 620M397 508L443 620" ${dash}/>` +
      `<path d="${pocketPath}" ${outline(2.6)}/>`

  const cordPath = (x: number, end: number) => `M${x} 240C${x - 2} 272 ${end + 2} 300 ${end} 338`
  const cords = back
    ? ''
    : [
        [302, 296],
        [338, 344],
      ]
        .map(([x, end]) => {
          const d = cordPath(x, end)
          return (
            `<path d="${d}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>` +
            `<path d="${d}" fill="none" stroke="#fffdf6" stroke-width="3.6" stroke-linecap="round"/>` +
            `<rect x="${end - 4}" y="336" width="8" height="19" rx="3" fill="${INK}"/>`
          )
        })
        .join('') + [302, 338].map((x) => `<circle cx="${x}" cy="238" r="5.2" fill="#fffdf6" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="238" r="1.8" fill="${INK}"/>`).join('')

  const hood = back
    ? `<path d="${hoodRear}" fill="${hex}"/>` +
      `<path d="${hoodRear}" fill="url(#${uid}-hood)"/>` +
      `<path d="M320 42C311 100 311 176 320 242" ${thin(0.5)}/>` +
      `<path d="M310 48C301 110 301 178 310 240M330 48C339 110 339 178 330 240" ${dash}/>` +
      `<path d="M218 204C244 234 288 242 320 242C352 242 396 234 422 204V216C398 248 352 256 320 256C288 256 242 248 218 216Z" ${dark(t.shade(0.1))}/>` +
      `<path d="${hoodRear}" ${outline()}/>`
    : `<path d="${hoodFront}" fill="${hex}"/>` +
      `<path d="${hoodFront}" fill="url(#${uid}-hood)"/>` +
      `<path d="${opening}" fill="${hex}"/><path d="${opening}" fill="url(#${uid}-in)"/>` +
      `<path d="${rimStitch}" ${dash}/>` +
      `<path d="${opening}" ${outline(2.6)}/>` +
      `<path d="${hoodFront}" ${outline()}/>` +
      cords

  const body =
    `<defs>${defs}</defs>` +
    `<path d="${sil}" fill="${hex}"/>` +
    (back ? ctx.art('espalda') : ctx.art('frente') + ctx.art('pecho')) +
    `<g clip-path="url(#${uid}-sil)">` +
    `<rect x="134" width="372" height="740" fill="url(#${uid}-side)"/>` +
    `<rect width="640" height="740" fill="url(#${uid}-tilt)"/>` +
    pair(half + ribs + seams, CX) +
    `</g>` +
    pocket +
    `<path d="${sil}" ${outline()}/>` +
    hood
  return { width, height, body }
}

export const hoodieFront = (ctx: Ctx) => build(ctx, false)
export const hoodieBack = (ctx: Ctx) => build(ctx, true)
