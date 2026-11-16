import { INK } from './color'
import { clip, dark, light, linear, radial } from './svg'
import type { Built, Ctx } from './types'

const outline = (w = 3) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`
const thin = (op: number, w = 2) => `fill="none" stroke="${INK}" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"`

/** Gorra de frente: copa con dos paneles delanteros, botón, ojales y visera curva. */
export function capFront(ctx: Ctx): Built {
  const { uid, hex, tone: t, view } = ctx
  const { width, height } = view.viewBox
  const crown = 'M64 322C56 150 150 40 300 38C450 40 544 150 536 322Q300 350 64 322Z'
  const visor = 'M58 314C40 384 120 446 300 448C480 446 560 384 542 314Q300 352 58 314Z'
  const dash = `fill="none" stroke="${t.seam}" stroke-opacity="${t.seamOpacity}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linecap="round"`

  const defs =
    clip(`${uid}-crown`, `<path d="${crown}"/>`) +
    clip(`${uid}-visor`, `<path d="${visor}"/>`) +
    linear(`${uid}-side`, 60, 0, 540, 0, [
      [0, '#1b1340', t.shade(0.26)],
      [0.14, '#1b1340', t.shade(0.08)],
      [0.3, '#1b1340', 0],
      [0.7, '#1b1340', 0],
      [0.86, '#1b1340', t.shade(0.08)],
      [1, '#1b1340', t.shade(0.26)],
    ]) +
    radial(`${uid}-glow`, 220, 120, 190, 150, [
      [0, '#fff', t.light(0.22)],
      [1, '#fff', 0],
    ]) +
    linear(`${uid}-cast`, 0, 262, 0, 342, [
      [0, '#1b1340', 0],
      [1, '#1b1340', t.shade(0.3)],
    ]) +
    linear(`${uid}-vs`, 0, 330, 0, 448, [
      [0, '#1b1340', t.shade(0.34)],
      [0.3, '#1b1340', t.shade(0.08)],
      [0.75, '#fff', t.light(0.1)],
      [1, '#1b1340', t.shade(0.12)],
    ])

  const seams =
    `<path d="M300 48V338" ${thin(0.5)}/>` +
    `<path d="M300 44C196 58 96 170 112 332M300 44C404 58 504 170 488 332" ${thin(0.5)}/>` +
    `<path d="M292 50V332M308 50V332" ${dash}/>` +
    `<path d="M74 305Q300 333 526 305" ${dash}/>`

  const eyelets = [[252, 96], [348, 96], [128, 176], [472, 176]]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="4" fill="${INK}" fill-opacity=".7" stroke="${INK}" stroke-width="1.6"/>`)
    .join('')

  const body =
    `<defs>${defs}</defs>` +
    `<path d="${crown}" fill="${hex}"/>` +
    ctx.art('frontal') +
    `<g clip-path="url(#${uid}-crown)">` +
    `<rect width="600" height="520" fill="url(#${uid}-side)"/>` +
    `<rect width="600" height="520" fill="url(#${uid}-glow)"/>` +
    `<rect width="600" height="520" fill="url(#${uid}-cast)"/>` +
    seams +
    `</g>` +
    eyelets +
    `<path d="${crown}" ${outline()}/>` +
    // visera
    `<path d="${visor}" fill="${hex}"/>` +
    `<g clip-path="url(#${uid}-visor)">` +
    `<rect y="300" width="600" height="160" fill="url(#${uid}-vs)"/>` +
    `<path d="M58 314C40 384 120 446 300 448C480 446 560 384 542 314L534 318C548 380 470 430 300 432C130 430 52 380 66 318Z" ${dark(t.shade(0.14))}/>` +
    `<path d="M92 340C100 380 170 408 300 410" fill="none" stroke="${t.seam}" stroke-opacity="${t.seamOpacity}" stroke-width="1.8" stroke-dasharray="5 4"/>` +
    `<path d="M508 340C500 380 430 408 300 410M104 336C116 372 180 396 300 398C420 396 484 372 496 336" ${dash}/>` +
    `</g>` +
    `<path d="${visor}" ${outline()}/>` +
    // botón
    `<ellipse cx="300" cy="40" rx="15" ry="9" fill="${hex}"/><ellipse cx="300" cy="40" rx="15" ry="9" ${dark(t.shade(0.12))}/><ellipse cx="297" cy="38" rx="6" ry="3" ${light(t.light(0.3))}/><ellipse cx="300" cy="40" rx="15" ry="9" ${outline(2.6)}/>`
  return { width, height, body }
}

/** Gorra de lado: copa con panel lateral entre dos costuras, visera hacia la izquierda y cierre trasero. */
export function capSide(ctx: Ctx): Built {
  const { uid, hex, tone: t, view } = ctx
  const { width, height } = view.viewBox
  const silhouette =
    'M508 376Q330 402 190 374C150 392 80 404 26 394C14 382 30 364 62 352C112 334 150 326 168 318C152 280 164 196 244 160C322 128 438 142 484 226C508 268 514 326 508 376Z'
  const visor = 'M190 374C150 392 80 404 26 394C14 382 30 364 62 352C112 334 150 326 168 318Q182 346 190 374Z'
  const strap = 'M480 346L538 344Q552 344 552 358V374Q552 388 538 388L496 390Z'
  const dash = `fill="none" stroke="${t.seam}" stroke-opacity="${t.seamOpacity}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linecap="round"`

  const defs =
    clip(`${uid}-sil`, `<path d="${silhouette}"/>`) +
    clip(`${uid}-visor`, `<path d="${visor}"/>`) +
    linear(`${uid}-side`, 150, 0, 512, 0, [
      [0, '#1b1340', t.shade(0.12)],
      [0.2, '#1b1340', 0],
      [0.72, '#1b1340', t.shade(0.04)],
      [1, '#1b1340', t.shade(0.28)],
    ]) +
    radial(`${uid}-glow`, 290, 190, 200, 130, [
      [0, '#fff', t.light(0.22)],
      [1, '#fff', 0],
    ]) +
    linear(`${uid}-base`, 0, 330, 0, 402, [
      [0, '#1b1340', 0],
      [1, '#1b1340', t.shade(0.24)],
    ]) +
    linear(`${uid}-vs`, 0, 316, 0, 396, [
      [0, '#1b1340', t.shade(0.28)],
      [0.45, '#fff', t.light(0.06)],
      [1, '#1b1340', t.shade(0.2)],
    ])

  const seams =
    `<path d="M318 142C270 162 232 252 238 380" ${thin(0.5)}/>` +
    `<path d="M326 140C400 150 450 250 440 388" ${thin(0.5)}/>` +
    `<path d="M310 146C264 168 226 254 231 378M334 144C406 156 456 254 447 386" ${dash}/>` +
    `<path d="M190 368Q330 396 508 370" ${dash}/>`

  const body =
    `<defs>${defs}</defs>` +
    // cierre trasero (asoma por detrás de la copa)
    `<path d="${strap}" fill="${hex}"/><path d="${strap}" ${dark(t.shade(0.18))}/>` +
    `<path d="${strap}" ${outline(2.6)}/>` +
    `<circle cx="526" cy="360" r="4.2" fill="${INK}" fill-opacity=".7"/><circle cx="526" cy="374" r="4.2" fill="${INK}" fill-opacity=".7"/>` +
    `<path d="${silhouette}" fill="${hex}"/>` +
    ctx.art('lateral') +
    `<g clip-path="url(#${uid}-sil)">` +
    `<rect width="600" height="520" fill="url(#${uid}-side)"/>` +
    `<rect width="600" height="520" fill="url(#${uid}-glow)"/>` +
    `<rect width="600" height="520" fill="url(#${uid}-base)"/>` +
    seams +
    `<path d="${visor}" fill="${hex}"/>` +
    `<path d="${visor}" fill="url(#${uid}-vs)"/>` +
    `<path d="M186 366C146 382 84 392 38 386M180 354C140 364 92 368 54 370" ${dash}/>` +
    `<path d="M190 374C150 392 80 404 26 394L30 388C84 396 150 384 190 366Z" ${dark(t.shade(0.16))}/>` +
    `</g>` +
    [[288, 178], [362, 172]]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="4" fill="${INK}" fill-opacity=".7" stroke="${INK}" stroke-width="1.6" transform="rotate(-12 ${x} ${y})"/>`)
      .join('') +
    `<path d="M168 318Q182 346 190 374" ${thin(0.55)}/>` +
    `<path d="${silhouette}" ${outline()}/>` +
    `<ellipse cx="322" cy="136" rx="15" ry="8" fill="${hex}"/><ellipse cx="322" cy="136" rx="15" ry="8" ${dark(t.shade(0.12))}/><ellipse cx="319" cy="134" rx="6" ry="3" ${light(t.light(0.3))}/><ellipse cx="322" cy="136" rx="15" ry="8" ${outline(2.6)}/>`
  return { width, height, body }
}
