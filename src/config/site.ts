/**
 * Configuración central del negocio.
 * Todo lo que el dueño del negocio querrá cambiar (nombre, contacto, envíos, plazos)
 * está aquí. Los valores marcados como PLACEHOLDER hay que sustituirlos antes de publicar.
 */

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const site = {
  /** Nombre comercial (nombre de trabajo elegido: "Pieza Única"). */
  name: 'Pieza Única',
  /** Texto corto bajo el logo y en el <title>. */
  tagline: 'Ropa, gorras y tazas con tu diseño',
  description:
    'Personaliza camisetas, sudaderas, gorras y tazas con impresión DTF de colores vivos. Diseña online, ve el resultado al instante y recíbelo en casa.',
  url: siteUrl,
  locale: 'es-ES',
  currency: 'EUR',
  country: 'ES',

  /**
   * PLACEHOLDER: sustituir por los datos reales antes de publicar. Un campo vacío ('') se oculta en toda la web.
   * El teléfono, el WhatsApp y la dirección están vacíos a propósito: no se enseña ningún dato inventado.
   * El email de ejemplo usa un dominio reservado (.example) que no recibe correo; `sitePlaceholders()` lo detecta.
   */
  contact: {
    email: 'hola@piezaunica.example',
    phone: '',
    /** Solo dígitos con prefijo de país, sin "+" (formato wa.me). Con valor, aparece el botón flotante de WhatsApp. */
    whatsapp: '',
    instagram: '',
    tiktok: '',
    /** Dirección pública del taller o punto de recogida (no el domicilio fiscal, que va en `business`). */
    address: '',
    hours: 'Lunes a viernes de 10:00 a 18:00',
  },

  /**
   * PLACEHOLDER: datos del titular exigidos por la LSSI-CE (art. 10, aviso legal). Los valores que empiezan por "["
   * se resaltan en las páginas legales y `sitePlaceholders()` los detecta.
   * Si el titular es una sociedad, rellena también `registry` (p. ej. "Registro Mercantil de Madrid, Tomo X, Folio Y,
   * Hoja Z"): entonces es obligatorio.
   */
  business: {
    legalName: '[COMPLETAR: razón social o nombre y apellidos del autónomo]',
    taxId: '[COMPLETAR: NIF/CIF]',
    registeredAddress: '[COMPLETAR: domicilio fiscal]',
    registry: '',
    /** Proveedores de alojamiento, base de datos y correo, y dónde almacenan los datos (política de privacidad). */
    processors: '[COMPLETAR: proveedores de alojamiento, base de datos y correo, y país donde almacenan los datos]',
  },

  /** Importes en céntimos de euro, IVA incluido. */
  shipping: {
    flatCents: 495,
    /** Envío gratis a partir de este importe de pedido. */
    freeFromCents: 6000,
    /** Suplemento para Baleares. */
    balearesExtraCents: 300,
    /** Prefijos de código postal (2 primeros dígitos) a los que NO se envía desde la tienda online. */
    excludedPostalPrefixes: ['35', '38', '51', '52'],
    excludedZonesLabel: 'Canarias, Ceuta y Melilla',
    carrierLabel: 'mensajería 24-48 h',
    /** Dónde llega la tienda online; se usa en los textos de envío. */
    deliveryZonesLabel: 'la península y Baleares',
  },

  /** Plazos orientativos de producción (días laborables) antes del envío. */
  production: {
    leadDaysMin: 2,
    leadDaysMax: 4,
  },

  /** IVA general en España. Los precios de la tienda ya lo incluyen. */
  vatRate: 0.21,

  /** A partir de estas unidades en total recomendamos pedir presupuesto (precios por volumen). */
  b2b: {
    quoteFromUnits: 50,
  },

  /** Tamaño máximo de archivos que sube el cliente (bytes). */
  uploads: {
    maxArtworkBytes: 12 * 1024 * 1024,
    /** Vistas previas del producto generadas por el editor (WebP/PNG de ~900 px). */
    maxGeneratedBytes: 8 * 1024 * 1024,
    /** PNG de impresión a 300 ppp: una foto grande puede pesar decenas de MB; el editor baja los ppp hasta que cabe. */
    maxPrintBytes: 20 * 1024 * 1024,
    /** Tope global de archivos subidos que aún no pertenecen a ningún pedido ni presupuesto (protege la base de datos). */
    maxPendingBytes: 4 * 1024 * 1024 * 1024,
    /** Días que se conservan los archivos subidos que nunca llegaron a un pedido o presupuesto. */
    orphanRetentionDays: 14,
    /** Días tras los que se eliminan los pedidos que no llegaron a pagarse (y sus archivos). */
    unpaidOrderRetentionDays: 30,
    acceptedArtworkTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const,
  },
} as const

export type Site = typeof site

/** ¿Es un dato de ejemplo que hay que sustituir? ("[COMPLETAR…]" o un email del dominio reservado .example). */
export function isPlaceholderValue(value: string): boolean {
  return value.startsWith('[') || /@[^@\s]*\.example$/i.test(value)
}

/**
 * Datos de `site` que siguen siendo de ejemplo. El arranque en producción los registra como error
 * (ver `productionConfigIssues`) para que no se publique la web con datos del titular o de contacto ficticios.
 */
export function sitePlaceholders(): string[] {
  const { business, contact } = site
  const fields: [string, string][] = [
    ['business.legalName', business.legalName],
    ['business.taxId', business.taxId],
    ['business.registeredAddress', business.registeredAddress],
    ['business.processors', business.processors],
    ['contact.email', contact.email],
  ]
  return fields.filter(([, value]) => isPlaceholderValue(value)).map(([name]) => name)
}
