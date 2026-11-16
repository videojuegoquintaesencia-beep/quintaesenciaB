const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const eurNoDecimals = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const num1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })

/** 1290 → "12,90 €". Con `compact`, los importes redondos pierden los decimales ("12 €"). */
export function formatEUR(cents: number, opts?: { compact?: boolean }): string {
  const value = cents / 100
  if (opts?.compact && Number.isInteger(value)) return eurNoDecimals.format(value)
  return eur.format(value)
}

/** 12.5 → "12,5 cm" */
export function formatCm(value: number): string {
  return `${num1.format(value)} cm`
}

export function formatNumber(value: number): string {
  return num1.format(value)
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d)
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return Number.isNaN(d.getTime()) ? '' : dateTimeFmt.format(d)
}

/** "1 unidad" / "3 unidades" */
export function unidades(n: number): string {
  return `${n} ${n === 1 ? 'unidad' : 'unidades'}`
}
