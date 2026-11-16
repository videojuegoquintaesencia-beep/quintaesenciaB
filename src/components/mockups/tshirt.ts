import { INK } from './color'
import { symmetric, type Seg } from './geom'
import { clip, dark, light, linear, pair } from './svg'
import type { Built, Ctx } from './types'

const CX = 300
/** Arco del cuello trasero que cierra la silueta por arriba. */
const NECK_ARC = 'Q300 85 238 90'

/** Mitad izquierda de la silueta: del cuello al centro del bajo, pasando por hombro, manga y costado. */
const SIDE: Seg[] = [
  ['C', 210, 94, 170, 106, 130, 120], // costura del hombro
  ['Q', 92, 160, 34, 224], // borde exterior de la manga
  ['L', 113, 293], // bajo de la manga hasta la axila
  ['C', 112, 400, 111, 520, 110, 636], // costado
  ['Q', 205, 642, 300, 643], // bajo
]

const outline = (w = 3) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`
const thin = (op: number) => `fill="none" stroke="${INK}" stroke-opacity="${op}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`

/** Cuello: abertura (interior de la prenda), cinta y pespunte según la vista. */
function neck(back: boolean) {
  return back
    ? {
        hole: 'M238 90Q300 85 362 90Q300 116 238 90Z',
        band: 'M229 93Q300 132 371 93L362 90Q300 116 238 90Z',
        stitch: 'M233 96Q300 127 367 96',
        dropY: 4,
      }
    : {
        hole: 'M238 90Q300 85 362 90C357 130 332 154 300 154C268 154 243 130 238 90Z',
        band: 'M228 94C237 146 266 173 300 173C334 173 363 146 372 94L362 90C357 130 332 154 300 154C268 154 243 130 238 90Z',
        stitch: 'M233 97C242 142 268 167 300 167C332 167 358 142 367 97',
        dropY: 6,
      }
}

function build(ctx: Ctx, back: boolean): Built {
  const { uid, hex, tone: t, view } = ctx
  const { width, height } = view.viewBox
  const nk = neck(back)
  const sil = symmetric([238, 90], SIDE, CX, NECK_ARC)

  const defs =
    clip(`${uid}-sil`, `<path d="${sil}"/>`) +
    // oscurece los costados y deja un poco de luz arriba a la izquierda
    linear(`${uid}-side`, 110, 0, 490, 0, [
      [0, '#1b1340', t.shade(0.2)],
      [0.1, '#1b1340', t.shade(0.07)],
      [0.24, '#1b1340', 0],
      [0.76, '#1b1340', 0],
      [0.9, '#1b1340', t.shade(0.07)],
      [1, '#1b1340', t.shade(0.2)],
    ]) +
    linear(`${uid}-tilt`, 100, 90, 500, 640, [
      [0, '#fff', t.light(0.14)],
      [0.5, '#fff', 0],
      [1, '#1b1340', t.shade(0.1)],
    ]) +
    linear(`${uid}-slv`, 100, 130, 70, 290, [
      [0, '#fff', t.light(0.12)],
      [0.5, '#1b1340', 0],
      [1, '#1b1340', t.shade(0.15)],
    ])

  const half =
    // la manga se oscurece hacia abajo y proyecta sombra sobre el cuerpo
    `<path d="M130 120Q92 160 34 224L113 293C124 240 140 170 130 120Z" fill="url(#${uid}-slv)"/>` +
    `<path d="M130 120C142 184 126 250 113 293C140 288 156 252 152 200C150 170 146 144 140 128Z" ${dark(t.shade(0.09))}/>` +
    // pliegues: uno por debajo de la axila, otros dos en el costado
    `<path d="M115 298C132 322 152 334 178 340C156 322 134 308 115 298Z" ${dark(t.shade(0.15))}/>` +
    `<path d="M122 350C156 392 168 470 160 570C150 500 140 420 122 350Z" ${dark(t.shade(0.09))}/>` +
    `<path d="M134 358C166 400 178 470 172 540C186 474 166 410 134 358Z" ${light(t.light(0.09))}/>` +
    // dobladillos de manga y bajo
    `<path d="M34 224L113 293L104 275L46 212Z" ${dark(t.shade(0.1))}/>` +
    `<path d="M110 636Q205 642 300 643L300 626Q205 625 111 620Z" ${dark(t.shade(0.1))}/>`

  const dash = `fill="none" stroke="${t.seam}" stroke-opacity="${t.seamOpacity}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linecap="round"`
  const seams =
    `<path d="M130 120C148 170 142 246 114 292" ${thin(0.5)}/>` + // costura de la sisa
    `<path d="M47 211L102 270" ${dash}/>` + // pespunte de la bocamanga
    `<path d="M112 621Q205 626 300 627" ${dash}/>` // pespunte del bajo

  const tag = back
    ? `<rect x="288" y="118" width="24" height="26" rx="4" fill="#fff" fill-opacity=".92" stroke="${INK}" stroke-width="1.6"/>` +
      `<path d="M293 127H307M293 134H302" stroke="${INK}" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>`
    : ''

  const body =
    `<defs>${defs}</defs>` +
    `<path d="${sil}" fill="${hex}"/>` +
    (back ? ctx.art('espalda') : ctx.art('frente') + ctx.art('pecho')) +
    `<g clip-path="url(#${uid}-sil)">` +
    `<rect x="110" width="380" height="700" fill="url(#${uid}-side)"/>` +
    `<rect width="600" height="700" fill="url(#${uid}-tilt)"/>` +
    pair(half + seams, CX) +
    `<path d="${nk.band}" transform="translate(0 ${nk.dropY})" ${dark(t.shade(0.13))}/>` +
    `</g>` +
    `<path d="${nk.hole}" ${dark(t.shade(0.4))}/>` +
    `<path d="${nk.band}" fill="${hex}"/>` +
    `<path d="${nk.band}" ${dark(t.shade(0.07))}/>` +
    `<path d="${nk.band}" ${light(t.light(0.07))}/>` +
    `<path d="${nk.stitch}" ${dash}/>` +
    tag +
    `<path d="${sil}" ${outline()}/>` +
    `<path d="${nk.band}" ${outline(2.4)}/>`
  return { width, height, body }
}

export const tshirtFront = (ctx: Ctx) => build(ctx, false)
export const tshirtBack = (ctx: Ctx) => build(ctx, true)
