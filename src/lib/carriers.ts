/**
 * Transportistas con los que se envían los pedidos y sus enlaces de seguimiento.
 *
 * Es código puro (vale en el navegador y en el servidor). El pedido guarda el transportista como texto libre
 * (`orders.carrier`), así que aquí se reconoce por su NOMBRE (sin distinguir mayúsculas ni acentos) o por su id:
 * los pedidos antiguos y los escritos a mano con "Otro" siguen funcionando, solo que sin enlace.
 *
 * Las plantillas de URL son las públicas de cada mensajería; no se han podido comprobar desde este entorno
 * (sin acceso a esas webs), así que conviene abrir una con un código real la primera vez que se use (ver README).
 */

export interface Carrier {
  id: string
  name: string
  /** URL pública de seguimiento para un código ya codificado para URL; `null` si no hay seguimiento en línea. */
  trackingUrl: ((encodedCode: string) => string) | null
}

export const CARRIERS: readonly Carrier[] = [
  {
    id: 'correos',
    name: 'Correos',
    trackingUrl: (c) => `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${c}`,
  },
  {
    id: 'correos-express',
    name: 'Correos Express',
    trackingUrl: (c) => `https://s.correosexpress.com/SeguimientoSinCP/search?n=${c}`,
  },
  { id: 'seur', name: 'SEUR', trackingUrl: (c) => `https://www.seur.com/livetracking/?segOnlineIdentificador=${c}` },
  {
    id: 'mrw',
    name: 'MRW',
    trackingUrl: (c) => `https://www.mrw.es/seguimiento_envios/MRW_resultados_consultas.asp?modo=nacional&envio=${c}`,
  },
  { id: 'gls', name: 'GLS', trackingUrl: (c) => `https://gls-group.com/ES/es/seguimiento-envio/?match=${c}` },
  {
    id: 'nacex',
    name: 'Nacex',
    // Nacex identifica el envío por agencia de origen y número de albarán ("0801/12345678"); si el código viene
    // sin agencia se consulta por número y la web pide el dato que falte.
    trackingUrl: (c) => {
      const m = /^(\d{3,4})(?:%2F|-)(\d+)$/i.exec(c)
      return m
        ? `https://www.nacex.es/seguimientoDetalle.do?agencia_origen=${m[1]}&numero_albaran=${m[2]}`
        : `https://www.nacex.es/seguimientoDetalle.do?numero_albaran=${c}`
    },
  },
  { id: 'dhl', name: 'DHL', trackingUrl: (c) => `https://www.dhl.com/es-es/home/tracking.html?tracking-id=${c}&submit=1` },
  { id: 'ups', name: 'UPS', trackingUrl: (c) => `https://www.ups.com/track?loc=es_ES&tracknum=${c}` },
  { id: 'mano', name: 'Entrega en mano', trackingUrl: null },
]

/** Valor del desplegable para escribir un transportista que no está en la lista. */
export const OTHER_CARRIER = 'Otro'

/** "Correos  Express" / "correos express" / "correos-express" → "correos express". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim()
}

/** Transportista reconocido a partir de lo que guarda el pedido (nombre o id), o `undefined`. */
export function findCarrier(value: string | null | undefined): Carrier | undefined {
  if (!value) return undefined
  const key = normalize(value)
  if (key === '') return undefined
  return CARRIERS.find((c) => normalize(c.name) === key || normalize(c.id) === key)
}

/**
 * Enlace de seguimiento del envío, o `null` si el transportista no se reconoce, no tiene seguimiento en línea
 * o el código está vacío. El código se codifica para URL (encodeURIComponent) tal cual lo escribió el panel.
 */
export function trackingUrlFor(carrier: string | null | undefined, code: string | null | undefined): string | null {
  const found = findCarrier(carrier)
  const trimmed = code?.trim() ?? ''
  if (!found?.trackingUrl || trimmed === '') return null
  return found.trackingUrl(encodeURIComponent(trimmed))
}
