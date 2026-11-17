import { QUANTITY_DISCOUNTS, type Product } from '@/config/products'
import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'
import { sizeLabel } from './appearance'

export interface Faq {
  question: string
  answer: string
}

const FORMAT_NAMES: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WebP',
  'image/svg+xml': 'SVG',
}

function specific(product: Product): Faq {
  const areas = product.views.flatMap((v) => v.areas)
  switch (product.id) {
    case 'camiseta':
      return {
        question: '¿Puedo estampar por delante y por detrás?',
        answer:
          'Sí. Puedes usar el frente, el pecho izquierdo y la espalda a la vez. Cada zona se calcula por separado según el espacio que ocupe tu diseño.',
      }
    case 'hoodie':
      return {
        question: '¿Se ve bien el estampado sobre colores oscuros?',
        answer:
          'Sí. El DTF mantiene los colores vivos también sobre tejidos oscuros. Elige el color de la sudadera en esta página y comprueba el resultado en el personalizador.',
      }
    case 'gorra':
      return {
        question: '¿Dónde se imprime la gorra?',
        answer: `En el frontal (hasta ${sizeLabel(areas[0].widthCm, areas[0].heightCm)}) y, si quieres, también en el lateral (hasta ${sizeLabel(areas[1].widthCm, areas[1].heightCm)}). Es de talla única, con cierre ajustable.`,
      }
    case 'taza':
      return {
        question: '¿Puedo elegir el color del interior y del asa?',
        answer: `Sí. El cuerpo de la taza es siempre blanco y el diseño envuelve la taza (hasta ${sizeLabel(areas[0].widthCm, areas[0].heightCm)}). Las opciones con interior y asa de color suman ${formatEUR(product.colors.find((c) => c.surchargeCents)?.surchargeCents ?? 0)} por unidad.`,
      }
  }
}

/** Preguntas frecuentes de un producto. Todo sale del catálogo y de la configuración del sitio. */
export function productFaqs(product: Product): Faq[] {
  const discounts = QUANTITY_DISCOUNTS.filter((d) => d.pct > 0)
  const first = discounts[0]
  const last = discounts[discounts.length - 1]
  const names = site.uploads.acceptedArtworkTypes.map((t) => FORMAT_NAMES[t] ?? t)
  const formats = names.length > 1 ? `${names.slice(0, -1).join(', ')} o ${names[names.length - 1]}` : names.join('')
  const maxMb = Math.round(site.uploads.maxArtworkBytes / (1024 * 1024))

  return [
    specific(product),
    {
      question: '¿Hay un mínimo de unidades?',
      answer: first
        ? `No, puedes pedir una sola unidad. Si pides varias iguales, aplicamos un descuento desde ${first.minQty} unidades (${first.pct}\u00a0%) que sube hasta el ${last.pct}\u00a0% desde ${last.minQty} unidades.`
        : 'No, puedes pedir una sola unidad.',
    },
    {
      question: '¿Qué imágenes puedo subir?',
      answer: `Archivos ${formats} de hasta ${maxMb} MB. Cuanto más grande y nítida sea la imagen, mejor se imprime: el personalizador te avisa si una imagen tiene poca resolución para el tamaño que has elegido.`,
    },
    {
      question: '¿Cuánto tarda en llegar?',
      answer: `La producción lleva entre ${site.production.leadDaysMin} y ${site.production.leadDaysMax} días laborables y después se envía por ${site.shipping.carrierLabel}. Los pedidos grandes o con fecha límite, mejor consúltanoslos antes.`,
    },
  ]
}
