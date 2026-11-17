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
    'Personaliza camisetas, sudaderas, gorras y tazas con impresión DTF de colores vivos. Diseña online, ve el resultado al instante y recíbelo en casa. También pedidos para empresas, equipos y eventos.',
  url: siteUrl,
  locale: 'es-ES',
  currency: 'EUR',
  country: 'ES',

  /** PLACEHOLDER: sustituir por los datos reales. Si un campo se deja vacío ('') la web lo oculta. */
  contact: {
    email: 'hola@piezaunica.example',
    phone: '+34 600 000 000',
    /** Solo dígitos con prefijo de país, sin "+" (formato wa.me). */
    whatsapp: '34600000000',
    instagram: '',
    tiktok: '',
    address: 'Calle del Taller 12, 28001 Madrid',
    hours: 'Lunes a viernes de 10:00 a 18:00',
  },

  /** PLACEHOLDER: datos del titular exigidos por la LSSI-CE (aviso legal). */
  business: {
    legalName: '[COMPLETAR: razón social o nombre y apellidos del autónomo]',
    taxId: '[COMPLETAR: NIF/CIF]',
    registeredAddress: '[COMPLETAR: domicilio fiscal]',
    registry: '',
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
    maxGeneratedBytes: 8 * 1024 * 1024,
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
