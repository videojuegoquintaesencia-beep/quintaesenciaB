/** Llamadas fetch del navegador a /api/admin (importar solo desde componentes de cliente). */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number }

export async function postJson<T = Record<string, unknown>>(url: string, body: unknown): Promise<ApiResult<T>> {
  return requestJson<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

/** DELETE sin cuerpo (p. ej. restablecer una sección de ajustes a sus valores por defecto). */
export async function deleteJson<T = Record<string, unknown>>(url: string): Promise<ApiResult<T>> {
  return requestJson<T>(url, { method: 'DELETE' })
}

async function requestJson<T>(url: string, init: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init)
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
    if (res.status === 401) {
      return { ok: false, status: 401, error: 'Tu sesión ha caducado. Vuelve a entrar en el panel.' }
    }
    if (!res.ok || !data) {
      return { ok: false, status: res.status, error: data?.error ?? 'No se pudo completar la acción. Inténtalo de nuevo.' }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, status: 0, error: 'Sin conexión con el servidor. Comprueba tu red e inténtalo de nuevo.' }
  }
}
