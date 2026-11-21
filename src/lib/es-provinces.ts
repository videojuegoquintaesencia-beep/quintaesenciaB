/**
 * Provincias españolas por los dos primeros dígitos del código postal.
 * Sirve para autocompletar la provincia en el checkout y para comprobar que la dirección es coherente con las
 * zonas a las que se envía (prefijos excluidos que la dueña edita en el panel: `catalog.shipping`).
 */
import { isValidSpanishPostalCode, normalizePostalCode } from './pricing'
import type { ShippingSettings } from './settings-schema'

/** Lo que necesita este módulo de los ajustes de envío efectivos. */
export type DeliveryRules = Pick<ShippingSettings, 'excludedPostalPrefixes' | 'excludedZonesLabel'>

/** Mensaje único para cualquier dirección fuera de la zona de envío (código postal, provincia o localidad). */
export function undeliverableMessage(rules: Pick<ShippingSettings, 'excludedZonesLabel'>): string {
  return `Aún no enviamos a ${rules.excludedZonesLabel} desde la tienda. Escríbenos y lo vemos.`
}

const PROVINCE_BY_PREFIX: Record<string, string> = {
  '01': 'Álava',
  '02': 'Albacete',
  '03': 'Alicante',
  '04': 'Almería',
  '05': 'Ávila',
  '06': 'Badajoz',
  '07': 'Illes Balears',
  '08': 'Barcelona',
  '09': 'Burgos',
  '10': 'Cáceres',
  '11': 'Cádiz',
  '12': 'Castellón',
  '13': 'Ciudad Real',
  '14': 'Córdoba',
  '15': 'A Coruña',
  '16': 'Cuenca',
  '17': 'Girona',
  '18': 'Granada',
  '19': 'Guadalajara',
  '20': 'Gipuzkoa',
  '21': 'Huelva',
  '22': 'Huesca',
  '23': 'Jaén',
  '24': 'León',
  '25': 'Lleida',
  '26': 'La Rioja',
  '27': 'Lugo',
  '28': 'Madrid',
  '29': 'Málaga',
  '30': 'Murcia',
  '31': 'Navarra',
  '32': 'Ourense',
  '33': 'Asturias',
  '34': 'Palencia',
  '35': 'Las Palmas',
  '36': 'Pontevedra',
  '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife',
  '39': 'Cantabria',
  '40': 'Segovia',
  '41': 'Sevilla',
  '42': 'Soria',
  '43': 'Tarragona',
  '44': 'Teruel',
  '45': 'Toledo',
  '46': 'Valencia',
  '47': 'Valladolid',
  '48': 'Bizkaia',
  '49': 'Zamora',
  '50': 'Zaragoza',
  '51': 'Ceuta',
  '52': 'Melilla',
}

/** Provincia que corresponde a un código postal completo (5 dígitos) o a su prefijo; null si no existe. */
export function provinceFromPostalCode(postalCode: string): string | null {
  const cp = normalizePostalCode(postalCode)
  if (cp.length < 2 || !/^\d{2}/.test(cp)) return null
  if (cp.length === 5 && !isValidSpanishPostalCode(cp)) return null
  return PROVINCE_BY_PREFIX[cp.slice(0, 2)] ?? null
}

/** Provincias a las que enviamos desde la tienda online (según los prefijos excluidos), ordenadas alfabéticamente. */
export function deliverableProvinces(excludedPrefixes: readonly string[]): string[] {
  return Object.entries(PROVINCE_BY_PREFIX)
    .filter(([prefix]) => !excludedPrefixes.includes(prefix))
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b, 'es'))
}

/* ───────────── Coherencia entre código postal, provincia y localidad ───────────── */

/** Minúsculas, sin tildes ni signos, con espacios simples ("A Coruña" → "a coruna"). */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Otros nombres con los que se conocen las provincias (castellano, cooficial, comunidad uniprovincial…). */
const PROVINCE_ALIASES: Record<string, string[]> = {
  '01': ['alava', 'araba', 'araba alava'],
  '03': ['alacant', 'alicante alacant'],
  '07': ['baleares', 'islas baleares', 'illes balears', 'balears'],
  '12': ['castello', 'castellon castello'],
  '15': ['la coruna', 'coruna', 'a coruna la coruna'],
  '17': ['gerona'],
  '20': ['guipuzcoa'],
  '25': ['lerida'],
  '26': ['rioja'],
  '28': ['comunidad de madrid'],
  '30': ['region de murcia'],
  '31': ['nafarroa', 'comunidad foral de navarra'],
  '32': ['orense'],
  '33': ['principado de asturias'],
  '39': ['cantabria'],
  '46': ['valencia valencia'],
  '48': ['vizcaya'],
}

const PREFIXES_BY_NAME = new Map<string, string[]>()
function addName(name: string, prefix: string) {
  const key = normalizeName(name)
  PREFIXES_BY_NAME.set(key, [...(PREFIXES_BY_NAME.get(key) ?? []), prefix])
}
for (const [prefix, name] of Object.entries(PROVINCE_BY_PREFIX)) addName(name, prefix)
for (const [prefix, names] of Object.entries(PROVINCE_ALIASES)) for (const name of names) addName(name, prefix)
// Nombres de zona que abarcan varias provincias.
addName('canarias', '35')
addName('canarias', '38')

/**
 * Nombres con los que la gente escribe las zonas que pueden quedar fuera del envío, con los prefijos de código
 * postal a los que pertenecen. Solo cuentan cuando TODOS sus prefijos están excluidos en los ajustes de envío: si
 * la dueña empieza a enviar a Canarias, «Tenerife» deja de rechazarse. Los nombres que también son localidades de
 * la península (La Palma, El Hierro, Las Palmas a secas) solo se miran en el campo de provincia.
 */
const ZONE_PHRASES: { phrase: string; prefixes: string[]; inCity: boolean }[] = [
  { phrase: 'canarias', prefixes: ['35', '38'], inCity: true },
  { phrase: 'las palmas', prefixes: ['35'], inCity: false },
  { phrase: 'las palmas de gran canaria', prefixes: ['35'], inCity: true },
  { phrase: 'gran canaria', prefixes: ['35'], inCity: true },
  { phrase: 'lanzarote', prefixes: ['35'], inCity: true },
  { phrase: 'fuerteventura', prefixes: ['35'], inCity: true },
  { phrase: 'tenerife', prefixes: ['38'], inCity: true },
  { phrase: 'la gomera', prefixes: ['38'], inCity: true },
  { phrase: 'la palma', prefixes: ['38'], inCity: false },
  { phrase: 'el hierro', prefixes: ['38'], inCity: false },
  { phrase: 'ceuta', prefixes: ['51'], inCity: true },
  { phrase: 'melilla', prefixes: ['52'], inCity: true },
]

const containsPhrase = (text: string, phrase: string) => ` ${text} `.includes(` ${phrase} `)

export interface AddressZoneIssue {
  field: 'province' | 'city'
  message: string
}

/**
 * El servidor solo valida el código postal para decidir el envío; sin este cruce se podía poner un CP peninsular
 * con provincia o localidad de una zona sin envío (Canarias, Ceuta o Melilla por defecto), de otra provincia o
 * inventada. La provincia debe ser una provincia real (en castellano, cooficial o alias habitual) y corresponder al
 * código postal. Devuelve el primer problema encontrado o null si todo cuadra.
 */
export function addressZoneIssue(address: { postalCode: string; province: string; city: string }, rules: DeliveryRules): AddressZoneIssue | null {
  const prefix = normalizePostalCode(address.postalCode).slice(0, 2)
  const province = normalizeName(address.province)
  const city = normalizeName(address.city)
  const excluded = undeliverableMessage(rules)
  const active = ZONE_PHRASES.filter((z) => z.prefixes.every((p) => rules.excludedPostalPrefixes.includes(p)))
  if (active.some((z) => containsPhrase(province, z.phrase))) return { field: 'province', message: excluded }
  if (active.some((z) => z.inCity && containsPhrase(city, z.phrase))) return { field: 'city', message: excluded }
  const known = PREFIXES_BY_NAME.get(province)
  if (!known) return { field: 'province', message: 'Elige una provincia de la lista.' }
  if (!known.includes(prefix)) return { field: 'province', message: 'La provincia no coincide con el código postal.' }
  return null
}
