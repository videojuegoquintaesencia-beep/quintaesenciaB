import { useId, useMemo } from 'react'
import { buildMockup } from '@/components/mockups/engine'
import { getColor, type PrintArea, type Product, type ProductView } from '@/config/products'
import { FONTS, type Layer, type TextLayer } from '@/lib/design'
import { areaOrigin } from '@/lib/editor/geometry'
import { getSticker } from '@/lib/stickers'
import { approxLineWidth, mainArea, TEXT_LINE_HEIGHT, TEXT_PADDING, type Template } from '@/lib/templates'
import { thumbnailCrop } from './thumb-crop'

/**
 * Miniatura estática de una plantilla: el mockup SVG del producto con las capas dibujadas también en SVG.
 * No necesita Konva ni canvas, así que sirve en el servidor (ficha de producto) y como repuesto en el editor.
 *
 * Los textos se miden con la aproximación de `src/lib/templates.ts` y se fuerzan a ese ancho con `textLength`:
 * aunque la tipografía real no haya cargado todavía (o nunca), la composición conserva sus proporciones.
 */
export function TemplateSvgThumb({
  template,
  product,
  colorId,
  view: viewProp,
  area: areaProp,
  className,
  label,
}: {
  template: Template
  product: Product
  colorId: string
  /** Vista y zona donde se aplica; por defecto, la zona principal del producto. */
  view?: ProductView
  area?: PrintArea
  className?: string
  /** Texto alternativo; con "" la miniatura es decorativa (el nombre va al lado). */
  label?: string
}) {
  const uid = useId().replace(/[^a-z0-9]/gi, '')
  const main = mainArea(product)
  const view = viewProp ?? product.views[0]
  const area = areaProp ?? main
  const color = getColor(product, colorId) ?? product.colors[0]
  // Los ids de capa son aleatorios y no se pintan: la salida es idéntica en servidor y cliente.
  const layers = useMemo(() => template.build(product, color.id, area), [template, product, color.id, area])
  const built = buildMockup({ productId: product.id, viewId: view.id, colorHex: color.hex, idSuffix: uid })
  if (!built) return null

  const ppc = view.pxPerCm
  const origin = areaOrigin(area, ppc)
  const clipId = `tpl-${uid}`
  const crop = thumbnailCrop(view, area)
  const alt = label ?? `Plantilla «${template.name}» sobre ${product.name.toLowerCase()} ${color.name.toLowerCase()}`
  const a11y = alt ? ({ role: 'img', 'aria-label': alt } as const) : ({ 'aria-hidden': true } as const)

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`} className={className} focusable="false" {...a11y}>
      <g dangerouslySetInnerHTML={{ __html: built.body }} />
      <defs>
        {/* El recorte se aplica en el sistema de coordenadas del grupo ya trasladado al origen de la zona. */}
        <clipPath id={clipId}>
          <rect x={0} y={0} width={area.widthCm * ppc} height={area.heightCm * ppc} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} transform={`translate(${origin.x} ${origin.y})`}>
        {layers.map((layer, i) => (
          <LayerSvg key={i} layer={layer} ppc={ppc} />
        ))}
      </g>
    </svg>
  )
}

function LayerSvg({ layer, ppc }: { layer: Layer; ppc: number }) {
  const w = layer.width * ppc
  const h = layer.height * ppc
  const transform = `translate(${layer.x * ppc} ${layer.y * ppc}) rotate(${layer.rotation})${layer.flipX ? ' scale(-1 1)' : ''}`
  if (layer.type === 'sticker') {
    const sticker = getSticker(layer.stickerId)
    if (!sticker) return null
    return (
      <g transform={transform} opacity={layer.opacity}>
        <path d={sticker.path} transform={`translate(${-w / 2} ${-h / 2}) scale(${w / 100} ${h / 100})`} fill={layer.fill ?? sticker.defaultFill} />
      </g>
    )
  }
  if (layer.type === 'text') return <TextSvg layer={layer} ppc={ppc} transform={transform} />
  // Las plantillas no llevan imágenes subidas; si alguna vez las llevaran, aquí iría su marcador.
  return null
}

/** Imita la geometría de Konva.Text: margen interior, líneas de 1,12 y el relleno pintado sobre el contorno. */
function TextSvg({ layer, ppc, transform }: { layer: TextLayer; ppc: number; transform: string }) {
  const fontSize = layer.sizeCm * ppc
  const outline = (layer.strokeCm ?? 0) * ppc
  const padding = TEXT_PADDING * fontSize + outline
  const lineHeight = TEXT_LINE_HEIGHT * fontSize
  const w = layer.width * ppc
  const h = layer.height * ppc
  const lines = layer.text.split('\n')
  const anchor = layer.align === 'left' ? 'start' : layer.align === 'right' ? 'end' : 'middle'
  const x = layer.align === 'left' ? -w / 2 + padding : layer.align === 'right' ? w / 2 - padding : 0
  return (
    <text
      transform={transform}
      fontFamily={FONTS[layer.font].family}
      fontSize={fontSize}
      fontWeight={layer.bold ? 700 : 400}
      fontStyle={layer.italic ? 'italic' : undefined}
      fill={layer.fill}
      stroke={outline > 0 ? (layer.strokeColor ?? '#1b1340') : undefined}
      strokeWidth={outline > 0 ? outline * 2 : undefined}
      strokeLinejoin="round"
      paintOrder="stroke"
      textAnchor={anchor}
      dominantBaseline="central"
      opacity={layer.opacity}
    >
      {lines.map((line, i) => (
        <tspan
          key={i}
          x={x}
          y={-h / 2 + padding + lineHeight * (i + 0.5)}
          textLength={Math.max(1, approxLineWidth(line, layer.font, layer.sizeCm, layer.bold) * ppc)}
          lengthAdjust="spacingAndGlyphs"
        >
          {line}
        </tspan>
      ))}
    </text>
  )
}
