/**
 * Lectura de cuerpos de petición con tope REAL de tamaño.
 *
 * Mirar solo `Content-Length` no basta: con `Transfer-Encoding: chunked` esa cabecera no existe y
 * `req.text()` / `req.formData()` bufferizan todo el cuerpo antes de que podamos rechazarlo. Aquí se lee
 * el flujo trozo a trozo, se cuentan los bytes y se aborta la lectura en cuanto se supera el máximo.
 */

export type BodyResult<T> = { ok: true; value: T } | { ok: false; status: 400 | 413 }

/** Lee el cuerpo como bytes; si supera `maxBytes` cancela el flujo y devuelve 413. */
export async function readBodyBytes(req: Request, maxBytes: number): Promise<BodyResult<Uint8Array>> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, status: 413 }
  if (!req.body) return { ok: true, value: new Uint8Array(0) }

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        // Deja de leer: el resto del cuerpo se descarta sin llegar a memoria.
        void reader.cancel().catch(() => {})
        return { ok: false, status: 413 }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, status: 400 }
  }

  if (chunks.length === 1) return { ok: true, value: chunks[0] }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, value: out }
}

/** Lee el cuerpo como texto UTF-8 con tope de bytes. */
export async function readBodyText(req: Request, maxBytes: number): Promise<BodyResult<string>> {
  const res = await readBodyBytes(req, maxBytes)
  if (!res.ok) return res
  try {
    return { ok: true, value: new TextDecoder('utf-8', { fatal: true }).decode(res.value) }
  } catch {
    return { ok: false, status: 400 }
  }
}

/** Lee el cuerpo como JSON con tope de bytes (400 si no es JSON válido). */
export async function readBodyJson(req: Request, maxBytes: number): Promise<BodyResult<unknown>> {
  const res = await readBodyText(req, maxBytes)
  if (!res.ok) return res
  try {
    return { ok: true, value: JSON.parse(res.value) as unknown }
  } catch {
    return { ok: false, status: 400 }
  }
}

/** Lee un cuerpo multipart/form-data con tope de bytes y lo interpreta como FormData. */
export async function readBodyForm(req: Request, maxBytes: number): Promise<BodyResult<FormData>> {
  const contentType = req.headers.get('content-type') ?? ''
  if (!/^multipart\/form-data\s*;/i.test(contentType)) return { ok: false, status: 400 }
  const res = await readBodyBytes(req, maxBytes)
  if (!res.ok) return res
  try {
    const form = await new Response(res.value as BodyInit, { headers: { 'content-type': contentType } }).formData()
    return { ok: true, value: form }
  } catch {
    return { ok: false, status: 400 }
  }
}
