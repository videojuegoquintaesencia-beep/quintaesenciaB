/**
 * Provincias españolas por los dos primeros dígitos del código postal.
 * Sirve para autocompletar la provincia en el checkout.
 */
import { site } from '@/config/site'
import { isValidSpanishPostalCode, normalizePostalCode } from './pricing'

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

const excluded = site.shipping.excludedPostalPrefixes as readonly string[]

/** Provincia que corresponde a un código postal completo (5 dígitos) o a su prefijo; null si no existe. */
export function provinceFromPostalCode(postalCode: string): string | null {
  const cp = normalizePostalCode(postalCode)
  if (cp.length < 2 || !/^\d{2}/.test(cp)) return null
  if (cp.length === 5 && !isValidSpanishPostalCode(cp)) return null
  return PROVINCE_BY_PREFIX[cp.slice(0, 2)] ?? null
}

/** Provincias a las que enviamos desde la tienda online, ordenadas alfabéticamente. */
export const DELIVERABLE_PROVINCES: string[] = Object.entries(PROVINCE_BY_PREFIX)
  .filter(([prefix]) => !excluded.includes(prefix))
  .map(([, name]) => name)
  .sort((a, b) => a.localeCompare(b, 'es'))

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

/** Palabras que identifican las zonas a las que no enviamos. En la provincia son más amplias que en la localidad. */
const EXCLUDED_IN_PROVINCE = ['canarias', 'las palmas', 'gran canaria', 'tenerife', 'lanzarote', 'fuerteventura', 'la gomera', 'la palma', 'el hierro', 'ceuta', 'melilla']
const EXCLUDED_IN_CITY = ['canarias', 'las palmas de gran canaria', 'gran canaria', 'tenerife', 'lanzarote', 'fuerteventura', 'la gomera', 'ceuta', 'melilla']

const containsPhrase = (text: string, phrase: string) => ` ${text} `.includes(` ${phrase} `)

export interface AddressZoneIssue {
  field: 'province' | 'city'
  message: string
}

/**
 * El servidor solo valida el código postal para decidir el envío; sin este cruce se podía poner un CP peninsular
 * con provincia o localidad de Canarias/Ceuta/Melilla (zonas sin envío), de otra provincia o inventada. La provincia
 * debe ser una provincia real (en castellano, cooficial o alias habitual) y corresponder al código postal.
 * Devuelve el primer problema encontrado o null si todo cuadra.
 */
export function addressZoneIssue(address: { postalCode: string; province: string; city: string }): AddressZoneIssue | null {
  const prefix = normalizePostalCode(address.postalCode).slice(0, 2)
  const province = normalizeName(address.province)
  const city = normalizeName(address.city)
  const excluded = `Aún no enviamos a ${site.shipping.excludedZonesLabel} desde la tienda. Escríbenos y lo vemos.`
  if (EXCLUDED_IN_PROVINCE.some((p) => containsPhrase(province, p))) return { field: 'province', message: excluded }
  if (EXCLUDED_IN_CITY.some((p) => containsPhrase(city, p))) return { field: 'city', message: excluded }
  const known = PREFIXES_BY_NAME.get(province)
  if (!known) return { field: 'province', message: 'Elige una provincia de la lista.' }
  if (!known.includes(prefix)) return { field: 'province', message: 'La provincia no coincide con el código postal.' }
  return null
}
