/**
 * Conversión entre lo que escribe la dueña en el panel y los números que guarda la API.
 * Los importes se guardan en céntimos; en el formulario se escriben en euros ("8,90" o "8.90").
 */

const euroInput = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })

/** 890 → "8,90" (sin separador de miles, para que se pueda volver a leer tal cual). */
export function centsToEuroInput(cents: number): string {
  return euroInput.format(cents / 100)
}

/** "8,90" | "8.90" | "9" | "8,9 €" → céntimos; null si no es un importe válido (máximo dos decimales). */
export function euroInputToCents(value: string): number | null {
  const clean = value.trim().replace(/\s|€/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  return Math.round(Number(clean) * 100)
}

/** Entero no negativo escrito por la dueña; null si no lo es. */
export function parseIntegerInput(value: string): number | null {
  const clean = value.trim()
  if (!/^\d+$/.test(clean)) return null
  return Number(clean)
}

/** Número con decimales opcionales (coma o punto), p. ej. superficies en cm²; null si no es válido. */
export function parseDecimalInput(value: string): number | null {
  const clean = value.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(clean)) return null
  return Number(clean)
}

/** 78 → "78"; 32.5 → "32,5" (lo que se escribe en el campo). */
export function decimalToInput(value: number): string {
  return String(value).replace('.', ',')
}
