/** Utilidades comunes de las rutas /api/admin (solo servidor). */
import 'server-only'
import type { z } from 'zod'
import { readBodyJson } from '@/lib/http-body'
import { firstZodError } from '@/lib/validators'
import { isValidId } from '@/lib/ids'

const MAX_BODY_BYTES = 32 * 1024

export function jsonError(error: string, status: number, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers })
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response }

/** Lee el cuerpo JSON de la petición y lo valida con zod. Nunca lanza. */
export async function parseJsonBody<S extends z.ZodType>(req: Request, schema: S): Promise<Parsed<z.infer<S>>> {
  // Tope real de bytes: no basta con mirar Content-Length (un cuerpo "chunked" no lo trae).
  const read = await readBodyJson(req, MAX_BODY_BYTES)
  if (!read.ok) {
    return { ok: false, response: read.status === 413 ? jsonError('Petición demasiado grande', 413) : jsonError('Datos no válidos', 400) }
  }
  const raw = read.value
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, response: jsonError('Datos no válidos', 400) }
  const result = schema.safeParse(raw)
  if (!result.success) return { ok: false, response: jsonError(firstZodError(result.error), 400) }
  return { ok: true, data: result.data }
}

/** Devuelve el id de la ruta si tiene el formato esperado, o una respuesta 404. */
export async function routeId(ctx: { params: Promise<{ id: string }> }): Promise<{ id: string } | { response: Response }> {
  const { id } = await ctx.params
  if (!isValidId(id)) return { response: jsonError('No encontrado', 404) }
  return { id }
}
