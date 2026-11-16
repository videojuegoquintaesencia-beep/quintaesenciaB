const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Identificador aleatorio no adivinable (alfabeto a-z0-9). Funciona en navegador, Node y edge. */
export function newId(length = 20): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

/** Valida el formato de ids generados con newId (para rutas y parámetros). */
export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{12,40}$/.test(value)
}
