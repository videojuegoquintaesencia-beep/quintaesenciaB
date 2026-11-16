import Konva from 'konva'
import type { TextConfig } from 'konva/lib/shapes/Text'
import { FONTS, type TextLayer } from '@/lib/design'
import { FONT_CAPS } from './fonts'

/** Escala de referencia (px por cm) con la que se mide el texto. */
const MEASURE_PPC = 100
const LINE_HEIGHT = 1.12

function fontStyle(layer: TextLayer): string {
  const caps = FONT_CAPS[layer.font]
  const parts = []
  if (layer.italic && caps.italic) parts.push('italic')
  if (layer.bold && caps.bold) parts.push('bold')
  return parts.join(' ') || 'normal'
}

/**
 * Configuración de Konva.Text de una capa de texto a `ppc` píxeles por cm.
 * El contorno (strokeCm) es el grosor VISIBLE hacia fuera; se pinta el relleno encima del trazo,
 * así que el trazo de Konva mide el doble. El `padding` reserva el hueco del contorno y de los rabillos.
 */
export function textConfig(layer: TextLayer, ppc: number): TextConfig {
  const fontSize = layer.sizeCm * ppc
  const outline = (layer.strokeCm ?? 0) * ppc
  return {
    text: layer.text,
    fontFamily: FONTS[layer.font].family,
    fontSize,
    fontStyle: fontStyle(layer),
    lineHeight: LINE_HEIGHT,
    align: layer.align,
    fill: layer.fill,
    stroke: outline > 0 ? (layer.strokeColor ?? '#1b1340') : undefined,
    strokeWidth: outline > 0 ? outline * 2 : 0,
    fillAfterStrokeEnabled: true,
    lineJoin: 'round',
    wrap: 'none',
    padding: fontSize * 0.07 + outline,
  }
}

/** Mide una capa de texto: devuelve su caja en cm (incluye contorno y margen). */
export function measureText(layer: TextLayer): { width: number; height: number } {
  const node = new Konva.Text(textConfig(layer, MEASURE_PPC))
  const size = { width: node.width() / MEASURE_PPC, height: node.height() / MEASURE_PPC }
  node.destroy()
  return { width: Math.max(0.3, Math.round(size.width * 100) / 100), height: Math.max(0.3, Math.round(size.height * 100) / 100) }
}

/** Devuelve la capa con `width`/`height` recalculados. */
export function withMeasure<T extends TextLayer>(layer: T): T {
  return { ...layer, ...measureText(layer) }
}
