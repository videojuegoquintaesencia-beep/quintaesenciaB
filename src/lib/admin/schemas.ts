/** Validación (zod) de lo que envía el panel a las rutas /api/admin. */
import { z } from 'zod'
import '@/lib/zod-es'
import { ORDER_STATUSES, QUOTE_STATUSES } from '@/lib/order-status'

const INVALID = 'Datos no válidos'
const text = () => z.string({ error: INVALID })

const noLineBreaks = (value: string) => !/[\r\n\u0000]/.test(value)

export const loginSchema = z.object({
  password: text().min(1, INVALID).max(200, INVALID),
})

export const statusChangeSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: 'Estado no válido' }),
  /** Nota para el historial (y para el email si se avisa al cliente). */
  note: text().trim().max(500, 'La nota es demasiado larga (máximo 500 caracteres)').optional(),
  carrier: text().trim().max(60, 'Transportista demasiado largo').refine(noLineBreaks, 'Transportista no válido').optional(),
  trackingCode: text()
    .trim()
    .max(80, 'Código de seguimiento demasiado largo')
    .refine(noLineBreaks, 'Código de seguimiento no válido')
    .optional(),
  notify: z.boolean({ error: INVALID }).default(false),
})

export const orderNoteSchema = z.object({
  note: text().max(2000, 'La nota es demasiado larga (máximo 2000 caracteres)'),
})

export const trackingSchema = z.object({
  carrier: text().trim().max(60, 'Transportista demasiado largo').refine(noLineBreaks, 'Transportista no válido'),
  trackingCode: text()
    .trim()
    .min(1, 'Introduce el código de seguimiento')
    .max(80, 'Código de seguimiento demasiado largo')
    .refine(noLineBreaks, 'Código de seguimiento no válido'),
  notify: z.boolean({ error: INVALID }).default(false),
})

export const quoteUpdateSchema = z
  .object({
    status: z.enum(QUOTE_STATUSES, { error: 'Estado no válido' }).optional(),
    adminNote: text().max(2000, 'La nota es demasiado larga (máximo 2000 caracteres)').optional(),
  })
  .refine((v) => v.status !== undefined || v.adminNote !== undefined, 'No hay nada que guardar')
