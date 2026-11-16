/** Errores de la API de pago ya traducidos para mostrarlos al cliente. */
export interface ApiFailure {
  message: string
  code?: string
  status: number
  lineIds?: string[]
  fieldErrors?: Record<string, string>
}

/** Error que ya se ha mostrado en pantalla (para que los botones de PayPal no pinten otro mensaje). */
export class CheckoutError extends Error {
  failure: ApiFailure
  constructor(failure: ApiFailure) {
    super(failure.message)
    this.name = 'CheckoutError'
    this.failure = failure
  }
}

export async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T; status: number } | { ok: false; failure: ApiFailure }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => null)) as (T & Partial<{ error: string; code: string; lineIds: string[]; fieldErrors: Record<string, string> }>) | null
    if (!res.ok || data === null) {
      return {
        ok: false,
        failure: {
          message: data?.error ?? 'No hemos podido completar la operación. Inténtalo de nuevo en un momento.',
          code: data?.code,
          status: res.status,
          lineIds: data?.lineIds,
          fieldErrors: data?.fieldErrors,
        },
      }
    }
    return { ok: true, data, status: res.status }
  } catch {
    return {
      ok: false,
      failure: { message: 'Parece que no hay conexión. Revisa tu internet e inténtalo de nuevo.', status: 0, code: 'network' },
    }
  }
}
