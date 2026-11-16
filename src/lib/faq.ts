/**
 * Preguntas frecuentes. Los importes, plazos y zonas salen de `config/`, así que las respuestas
 * no se desajustan si el negocio cambia sus tarifas.
 *
 * Marcado mínimo dentro de las respuestas: `[texto](/ruta)` para enlaces internos y `**texto**` para negrita.
 */
import { site } from '@/config/site'
import { PRODUCTS, QUANTITY_DISCOUNTS, fromPriceCents } from '@/config/products'
import { formatEUR } from './format'

export interface FaqItem {
  id: string
  question: string
  /** Un párrafo por elemento. */
  answer: string[]
}

export interface FaqGroup {
  id: string
  title: string
  items: FaqItem[]
}

const eur = (cents: number) => formatEUR(cents, { compact: false })
const { shipping, production, uploads, b2b } = site

const shippingFlat = eur(shipping.flatCents)
const shippingFree = formatEUR(shipping.freeFromCents, { compact: true })
const balearesTotal = eur(shipping.flatCents + shipping.balearesExtraCents)
const balearesExtra = eur(shipping.balearesExtraCents)
const maxUploadMb = Math.round(uploads.maxArtworkBytes / 1024 / 1024)
const firstDiscount = QUANTITY_DISCOUNTS.find((d) => d.pct > 0)
const topDiscount = QUANTITY_DISCOUNTS[QUANTITY_DISCOUNTS.length - 1]
const vatPct = Math.round(site.vatRate * 100)

const productPrices = PRODUCTS.map((p) => `${p.namePlural.toLowerCase()} desde ${formatEUR(fromPriceCents(p))}`)

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'pedidos',
    title: 'Pedidos y plazos',
    items: [
      {
        id: 'plazo',
        question: '¿Cuánto tarda en llegar mi pedido?',
        answer: [
          `Producimos cada pedido en **${production.leadDaysMin} a ${production.leadDaysMax} días laborables** desde que recibimos tu pago y revisamos tu archivo. Después lo enviamos por ${shipping.carrierLabel}.`,
          'Son plazos orientativos. Si lo necesitas para una fecha concreta, [escríbenos](/contacto) antes de comprar y te decimos si llegamos.',
        ],
      },
      {
        id: 'minimo',
        question: '¿Hay un pedido mínimo?',
        answer: [
          'No. Puedes pedir una sola unidad, con tu diseño y tu talla.',
          firstDiscount
            ? `Si pides más, aplicamos un descuento automático por volumen a cada línea del pedido: desde ${firstDiscount.minQty} unidades hasta un ${topDiscount.pct} % a partir de ${topDiscount.minQty}. Lo ves reflejado en el precio mientras diseñas.`
            : '',
        ].filter(Boolean),
      },
      {
        id: 'vista-previa',
        question: '¿Puedo ver cómo quedará antes de comprar?',
        answer: [
          'Sí. En el [personalizador](/personalizar) ves tu diseño sobre el producto y el precio se actualiza mientras diseñas.',
          'Es una simulación: el color real puede variar un poco según tu pantalla y la posición exacta puede diferir ligeramente de la imagen.',
        ],
      },
      {
        id: 'seguimiento',
        question: '¿Cómo sé en qué punto está mi pedido?',
        answer: [
          'Te escribimos por email al confirmar el pedido y cada vez que cambia de estado, y cuando se envía incluimos el seguimiento del transportista.',
          'También puedes consultarlo cuando quieras en [seguimiento de pedido](/seguimiento) con tu número de pedido y el email de compra.',
        ],
      },
      {
        id: 'cambios',
        question: '¿Puedo cambiar o cancelar un pedido?',
        answer: [
          'Escríbenos cuanto antes desde [contacto](/contacto) indicando tu número de pedido. Si todavía no hemos empezado a producirlo, lo cambiamos o cancelamos y te reembolsamos.',
          'Cuando el estampado ya está hecho no podemos deshacerlo, porque cada pedido se fabrica a medida.',
        ],
      },
      {
        id: 'devoluciones',
        question: '¿Puedo devolver un producto personalizado?',
        answer: [
          'Los productos personalizados se hacen según tus especificaciones, así que la ley no reconoce el derecho de desistimiento de 14 días en este caso (art. 103.c del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios).',
          'Lo que sí tienes siempre es la garantía legal de 3 años por falta de conformidad, y si el error de impresión es nuestro lo reimprimimos o te reembolsamos. Lo explicamos en las [condiciones de venta](/legal/condiciones).',
        ],
      },
    ],
  },
  {
    id: 'diseno',
    title: 'Diseño y archivos',
    items: [
      {
        id: 'archivos',
        question: '¿Qué archivos puedo subir?',
        answer: [
          `Imágenes PNG, JPG, WebP o SVG de hasta ${maxUploadMb} MB. Para el mejor resultado, usa un PNG con fondo transparente a 300 ppp al tamaño final de impresión.`,
          'Tienes todos los consejos en la guía [prepara tu diseño](/como-funciona#prepara-tu-diseno).',
        ],
      },
      {
        id: 'resolucion',
        question: '¿Qué pasa si mi imagen tiene poca resolución?',
        answer: [
          'El personalizador te avisa cuando una imagen no tiene calidad suficiente para el tamaño que has elegido. Puedes reducirla en el lienzo o subir una versión mejor.',
          'Además revisamos cada archivo antes de imprimir y, si vemos algo que pueda afectar al resultado, te escribimos.',
        ],
      },
      {
        id: 'revision',
        question: '¿Revisáis mi diseño antes de imprimir?',
        answer: [
          'Sí. Miramos la resolución, el fondo, los colores y que todo quede dentro de la zona de estampado. Si hay algo que mejorar, te lo decimos antes de producir.',
          'No imprimimos diseños ilegales, ofensivos o que vulneren derechos de terceros. Si ocurriera, te avisamos y te reembolsamos el pedido.',
        ],
      },
      {
        id: 'derechos',
        question: '¿Puedo imprimir logos, personajes o imágenes que he encontrado en internet?',
        answer: [
          'Solo si tienes derecho a usarlos. Las marcas, los personajes, las fotos y las ilustraciones suelen estar protegidos, y que una imagen esté publicada en internet no significa que se pueda imprimir.',
          'Quien sube el diseño responde de su contenido. Más detalles en las [condiciones de venta](/legal/condiciones).',
        ],
      },
      {
        id: 'colores',
        question: '¿Los colores saldrán igual que en mi pantalla?',
        answer: [
          'Muy parecidos, pero no idénticos: la pantalla emite luz y la impresión usa tinta. Te recomendamos trabajar en RGB. Los colores fluorescentes y los metalizados no se pueden reproducir con la tinta de impresión.',
        ],
      },
      {
        id: 'oscuras',
        question: '¿Se puede imprimir sobre prendas oscuras?',
        answer: [
          'Sí. En el DTF se imprime una capa de tinta blanca bajo los colores, y por eso se ven vivos también sobre prendas negras, azul marino o rojas. Te lo contamos en [cómo funciona](/como-funciona).',
        ],
      },
    ],
  },
  {
    id: 'productos',
    title: 'Productos y cuidados',
    items: [
      {
        id: 'que-productos',
        question: '¿Qué productos puedo personalizar?',
        answer: [
          `Camisetas, sudaderas con capucha, gorras y tazas. Precios con IVA: ${productPrices.join(', ')}.`,
          'El precio final depende del color, la talla, el tamaño del estampado, las zonas que imprimas y las unidades. Lo ves al instante en el [personalizador](/personalizar).',
        ],
      },
      {
        id: 'tallas',
        question: '¿Cómo elijo la talla?',
        answer: [
          'Las camisetas y las sudaderas son de corte unisex. Si dudas entre dos tallas, [escríbenos](/contacto) y te orientamos.',
        ],
      },
      {
        id: 'cuidados',
        question: '¿Cómo lavo y cuido mi prenda personalizada?',
        answer: [
          ...PRODUCTS.map((p) => `**${p.namePlural}:** ${p.care.join(' ')}`),
          'Con estos cuidados el estampado aguanta mejor el uso diario. Los repetimos en la guía de [cómo funciona](/como-funciona#cuidados).',
        ],
      },
      {
        id: 'duracion',
        question: '¿Cuánto dura el estampado?',
        answer: [
          'Está pensado para el uso diario y los lavados si sigues los cuidados indicados. No damos cifras de lavados porque dependen de la prenda, de cómo la laves y de cómo la uses.',
          'Si el estampado se estropea por un defecto de fabricación, entra en la garantía legal.',
        ],
      },
      {
        id: 'dtf',
        question: '¿Qué es el DTF?',
        answer: [
          'Direct-To-Film: imprimimos tu diseño con tintas de color y blanca sobre un film, le aplicamos un polvo adhesivo, lo fundimos y lo transferimos a la prenda con una prensa de calor. Te lo explicamos paso a paso en [cómo funciona](/como-funciona).',
        ],
      },
    ],
  },
  {
    id: 'envios',
    title: 'Envíos',
    items: [
      {
        id: 'coste-envio',
        question: '¿Cuánto cuesta el envío?',
        answer: [
          `El envío cuesta ${shippingFlat} y es **gratis a partir de ${shippingFree}** de pedido. A Baleares se suma un suplemento de ${balearesExtra} (${balearesTotal} en total) si no llegas al envío gratuito.`,
          'El coste exacto lo ves antes de pagar, según tu código postal.',
        ],
      },
      {
        id: 'zonas',
        question: '¿A qué zonas enviáis?',
        answer: [
          `A la España peninsular y a Baleares. Desde la tienda online no enviamos todavía a ${shipping.excludedZonesLabel}: [escríbenos](/contacto) y lo vemos.`,
          'Lo mismo si vives fuera de España. Cuéntanos qué necesitas y buscamos la mejor forma de hacértelo llegar.',
        ],
      },
      {
        id: 'transportista',
        question: '¿Cómo se envía mi pedido?',
        answer: [
          `Por ${shipping.carrierLabel}. Cuando el paquete sale de nuestro taller te avisamos por email con el seguimiento del transportista.`,
        ],
      },
      {
        id: 'danado',
        question: '¿Y si llega dañado o con algún error?',
        answer: [
          'Escríbenos en cuanto lo recibas, con tu número de pedido y unas fotos. Si el problema es nuestro (error de impresión, prenda dañada, producto distinto al pedido), lo reimprimimos o te reembolsamos.',
        ],
      },
    ],
  },
  {
    id: 'pagos',
    title: 'Pagos',
    items: [
      {
        id: 'como-pagar',
        question: '¿Cómo puedo pagar?',
        answer: [
          'Con PayPal. Pagas dentro de PayPal con tu cuenta o con las opciones que te muestre en ese momento, y nosotros nunca vemos ni guardamos los datos de tu tarjeta.',
        ],
      },
      {
        id: 'iva',
        question: '¿Los precios llevan IVA?',
        answer: [`Sí. Todos los importes que ves, productos y envío, llevan el ${vatPct} % de IVA incluido.`],
      },
      {
        id: 'factura',
        question: '¿Puedo pedir factura?',
        answer: [
          'Sí. Si compras como empresa o autónomo, indica el nombre de la empresa y el NIF/CIF al hacer el pedido. Si no lo hiciste, escríbenos con tu número de pedido y te preparamos la factura.',
        ],
      },
      {
        id: 'cobro',
        question: '¿Cuándo se cobra?',
        answer: [
          'En el momento en que confirmas el pago en PayPal. Hasta entonces no empezamos a producir el pedido.',
        ],
      },
    ],
  },
  {
    id: 'empresas',
    title: 'Empresas',
    items: [
      {
        id: 'precios-empresas',
        question: '¿Hacéis precios especiales para empresas, equipos o eventos?',
        answer: [
          `Aplicamos descuentos por volumen automáticos, de ${firstDiscount?.pct ?? 0} % a ${topDiscount.pct} % según las unidades de cada línea del pedido. Los tienes en la tabla de [empresas](/empresas#precios-por-volumen).`,
        ],
      },
      {
        id: 'presupuesto',
        question: '¿Cuándo conviene pedir presupuesto?',
        answer: [
          `Si necesitas más de ${b2b.quoteFromUnits} unidades, varios diseños o productos a la vez, una fecha de entrega concreta o ayuda con el diseño. Con menos unidades puedes pedir directamente en la web.`,
          'Rellena el [formulario de presupuesto](/empresas#presupuesto) y te respondemos en 1-2 días laborables.',
        ],
      },
      {
        id: 'varias-referencias',
        question: '¿Puedo pedir varios productos, diseños y tallas en el mismo pedido?',
        answer: [
          'Sí. En la tienda cada diseño es una línea del carrito, con sus tallas y cantidades. Para pedidos con muchas referencias, el presupuesto nos permite agruparlo todo y darte un precio y un plazo únicos.',
        ],
      },
      {
        id: 'plazo-empresas',
        question: '¿Qué plazo tienen los pedidos grandes?',
        answer: [
          `Los ${production.leadDaysMin} a ${production.leadDaysMax} días laborables son para pedidos habituales. En los pedidos grandes te damos un plazo concreto en el presupuesto, según las unidades y la fecha que necesites.`,
        ],
      },
      {
        id: 'factura-empresas',
        question: '¿Emitís factura con IVA?',
        answer: [`Sí. Los precios de la web incluyen el ${vatPct} % de IVA y te enviamos factura con tus datos fiscales.`],
      },
    ],
  },
]

/** Quita el marcado ([texto](/ruta) y **negrita**) para usar la respuesta como texto plano (JSON-LD, emails). */
export function faqPlainText(answer: string[]): string {
  return answer
    .map((p) => p.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1'))
    .join(' ')
}
