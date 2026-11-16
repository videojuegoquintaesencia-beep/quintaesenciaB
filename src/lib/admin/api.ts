/** Utilidades comunes de las rutas /api/admin (solo servidor). */
import 'server-only'
import type { z } from 'zod'
import { firstZodError } from '@/lib/validators'
import { isValidId } from '@/lib/ids'

const MAX_BODY_BYTES = 32 * 1024

export function jsonError(error: string, status: number, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers })
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response }

/** Lee el cuerpo JSON de la petición y lo valida con zod. Nunca lanza. */
export async function parseJsonBody<S extends z.ZodType>(req: Request, schema: S): Promise<Parsed<z.infer<S>>> {
  const length = Number(req.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return { ok: false, response: jsonError('Petición demasiado grande', 413) }
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { ok: false, response: jsonError('Datos no válidos', 400) }
  }
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
