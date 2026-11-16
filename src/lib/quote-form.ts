/**
 * Esquema del formulario de presupuesto: el de `validators.ts` con la fecha deseada comprobada
 * (que sea una fecha real y no esté en el pasado). Lo comparten el formulario (cliente) y /api/quotes (servidor).
 */
import { z } from 'zod'
import { QUOTE_PRODUCT_OPTIONS, quoteRequestSchema } from './validators'

export type QuoteProduct = (typeof QUOTE_PRODUCT_OPTIONS)[number]

/** Nombre de cada producto del formulario de presupuesto (plural, para chips y emails). */
export const QUOTE_PRODUCT_LABELS: Record<QuoteProduct, string> = {
  camiseta: 'Camisetas',
  hoodie: 'Sudaderas',
  gorra: 'Gorras',
  taza: 'Tazas',
  otro: 'Otro',
}

/** Fecha de hoy en España con formato AAAA-MM-DD. */
export function todayInMadrid(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(now)
}

function isRealDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export const quoteFormSchema = quoteRequestSchema.extend({
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')
    .refine((v) => isRealDate(v) && v >= todayInMadrid(), 'Elige una fecha de hoy en adelante')
    .optional()
    .or(z.literal('')),
})
