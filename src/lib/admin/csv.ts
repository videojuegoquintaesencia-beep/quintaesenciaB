/**
 * CSV para el Excel en español: UTF-8 con BOM, separador ";" y saltos de línea CRLF.
 * Las celdas de texto que empiezan por = + - @ (o tabulador / retorno) se prefijan con una comilla simple
 * para que ninguna hoja de cálculo las interprete como fórmulas (inyección CSV).
 */
const BOM = '\uFEFF'
const SEPARATOR = ';'

/** `{ literal }` marca un texto ya validado por el llamador (p. ej. un teléfono "+34…") que no necesita la comilla anti-fórmulas. */
export type CsvValue = string | number | null | undefined | { literal: string }

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  const literal = typeof value === 'object'
  let text = literal ? value.literal : String(value)
  if (!literal && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[";\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function buildCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(SEPARATOR))
  return `${BOM}${lines.join('\r\n')}\r\n`
}

/** 1290 → "12,90" (decimal con coma, sin símbolo de moneda ni separador de millares). */
export function eurosForCsv(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
