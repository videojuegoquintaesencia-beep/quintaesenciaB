import { INK, mix } from './color'
import { clip, light, linear, n, radial } from './svg'
import type { Built, Ctx } from './types'

const outline = (w = 3) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`

/** Rayado diagonal (líneas a 45°) para un rectángulo; hay que recortarlo a ese rectángulo. */
function hatch(x1: number, y1: number, x2: number, y2: number, step = 11): string {
  const h = y2 - y1
  let d = ''
  for (let x = x1 - h; x < x2; x += step) d += `M${n(x)} ${n(y2)}L${n(x + h)} ${n(y1)}`
  return d
}

/**
 * Taza desplegada: plantilla de la superficie de cerámica (siempre blanca). Las franjas rayadas de los
 * extremos son la zona del asa, donde conviene no imprimir; el borde superior y las mitades del asa
 * llevan el color del interior.
 */
export function mugWrap(ctx: Ctx): Built {
  const { uid, hex, tone: t, view } = ctx
  const { width, height } = view.viewBox
  const area = view.areas[0]
  const L = 42
  const R = width - 42
  const T = 52
  const B = 356
  const RIM = 24
  const GUARD = 70
  const band = `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" rx="28"/>`
  const strips = `<rect x="${L}" y="${T + RIM}" width="${GUARD}" height="${B - T - RIM}"/><rect x="${R - GUARD}" y="${T + RIM}" width="${GUARD}" height="${B - T - RIM}"/>`

  // mitades del asa, que sobresalen por los dos extremos de la plantilla
  const handle = (x: number, dir: 1 | -1) => {
    const d = `M${x} 136C${n(x - dir * 34)} 136 ${n(x - dir * 34)} 262 ${x} 262`
    return (
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${hex}" stroke-width="14" stroke-linecap="round"/>`
    )
  }

  const defs =
    clip(`${uid}-band`, band) +
    clip(`${uid}-strips`, strips) +
    linear(`${uid}-body`, 0, T, 0, B, [
      [0, '#1b1340', 0.03],
      [0.4, '#fff', 0],
      [1, '#1b1340', 0.09],
    ]) +
    linear(`${uid}-edge`, L, 0, R, 0, [
      [0, '#1b1340', 0.09],
      [0.05, '#1b1340', 0],
      [0.95, '#1b1340', 0],
      [1, '#1b1340', 0.09],
    ])

  const rimColor = hex.toLowerCase() === '#ffffff' ? mix(hex, '#1b1340', 0.1) : hex
  const body =
    `<defs>${defs}</defs>` +
    handle(L + 6, 1) +
    handle(R - 6, -1) +
    `<g>${band.replace('<rect ', '<rect fill="#fff" ')}</g>` +
    `<g clip-path="url(#${uid}-band)">` +
    `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="url(#${uid}-body)"/>` +
    `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="url(#${uid}-edge)"/>` +
    `<rect x="${L}" y="${T}" width="${R - L}" height="${RIM}" fill="${rimColor}"/>` +
    `<rect x="${L}" y="${T}" width="${R - L}" height="${RIM}" ${light(t.light(0.1))}/>` +
    `<path d="M${L} ${T + RIM}H${R}" stroke="${INK}" stroke-width="2.4"/>` +
    ctx.art(area.id) +
    `<g clip-path="url(#${uid}-strips)">` +
    `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="#fff" fill-opacity=".55"/>` +
    `<path d="${hatch(L, T + RIM, R, B)}" fill="none" stroke="${INK}" stroke-opacity=".34" stroke-width="1.7"/></g>` +
    `<path d="M${L + GUARD} ${T + RIM}V${B}M${R - GUARD} ${T + RIM}V${B}" stroke="${INK}" stroke-opacity=".4" stroke-width="1.8" stroke-dasharray="5 5"/>` +
    `</g>` +
    `<path d="M${n(area.center.x)} ${T + RIM}V${B}" stroke="${INK}" stroke-opacity=".5" stroke-width="2.2" stroke-dasharray="9 7" stroke-linecap="round"/>` +
    `<path d="M${n(area.center.x - 9)} ${B + 16}L${n(area.center.x)} ${B + 5}L${n(area.center.x + 9)} ${B + 16}Z" fill="${INK}" fill-opacity=".55"/>` +
    `<g ${outline()}>${band.replace('<rect ', '<rect fill="none" ')}</g>`
  return { width, height, body }
}

/** Ilustración de catálogo: taza en tres cuartos con el asa a la derecha y el interior de color. */
export function mugIcon(ctx: Ctx): Built {
  const { uid, hex, tone: t } = ctx
  const W = 520
  const H = 480
  const cx = 232
  const rx = 128
  const ry = 34
  const topY = 118
  const botY = 410
  const bodyPath = `M${cx - rx} ${topY}V${botY}A${rx} ${ry} 0 0 0 ${cx + rx} ${botY}V${topY}Z`
  const handlePath = `M${cx + rx - 4} 172C${cx + rx + 98} 158 ${cx + rx + 100} 342 ${cx + rx - 14} 364`
  const interior = mix(hex, '#1b1340', t.lum > 0.8 ? 0.08 : 0.2)
  const inner = `<ellipse cx="${cx}" cy="${topY + 1}" rx="${rx - 12}" ry="${ry - 8}"`

  const defs =
    clip(`${uid}-body`, `<path d="${bodyPath}"/>`) +
    linear(`${uid}-cyl`, cx - rx, 0, cx + rx, 0, [
      [0, '#1b1340', 0.14],
      [0.18, '#1b1340', 0],
      [0.62, '#1b1340', 0],
      [0.86, '#1b1340', 0.07],
      [1, '#1b1340', 0.22],
    ]) +
    linear(`${uid}-in`, 0, topY - ry, 0, topY + ry, [
      [0, '#1b1340', 0.34],
      [1, '#fff', 0.14],
    ]) +
    radial(`${uid}-floor`, cx + 30, botY + 30, 190, 30, [
      [0, '#1b1340', 0.2],
      [1, '#1b1340', 0],
    ])

  const body =
    `<defs>${defs}</defs>` +
    `<ellipse cx="${cx + 30}" cy="${botY + 28}" rx="190" ry="30" fill="url(#${uid}-floor)"/>` +
    // asa
    `<path d="${handlePath}" fill="none" stroke="${INK}" stroke-width="38" stroke-linecap="round"/>` +
    `<path d="${handlePath}" fill="none" stroke="${hex}" stroke-width="30" stroke-linecap="round"/>` +
    `<path d="${handlePath}" fill="none" stroke="#fff" stroke-opacity="${t.light(0.4)}" stroke-width="5" stroke-linecap="round" transform="translate(-4 -6)"/>` +
    // cuerpo con el diseño (si lo hay) y el volumen del cilindro por encima
    `<path d="${bodyPath}" fill="#fff"/>` +
    `<g clip-path="url(#${uid}-body)">${ctx.artIn({ cx: cx - 6, cy: 272, w: 176, h: 156 }, 'cara')}` +
    `<rect x="${cx - rx}" y="${topY}" width="${rx * 2}" height="${botY + ry - topY}" fill="url(#${uid}-cyl)"/>` +
    `<rect x="${cx - rx + 26}" y="${topY + 34}" width="13" height="${botY - topY - 50}" rx="6.5" fill="#fff" fill-opacity=".75"/></g>` +
    `<path d="${bodyPath}" ${outline()}/>` +
    // borde e interior
    `<ellipse cx="${cx}" cy="${topY}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
    `${inner} fill="${interior}"/>` +
    `${inner} fill="url(#${uid}-in)"/>` +
    `${inner} ${outline(2.4)}/>` +
    `<path d="M${cx - 70} ${topY + 27}Q${cx - 14} ${topY + 35} ${cx + 38} ${topY + 29}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>`
  return { width: W, height: H, body }
}
