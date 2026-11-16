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
