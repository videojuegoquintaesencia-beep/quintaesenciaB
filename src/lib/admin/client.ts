/** Llamadas fetch del navegador a /api/admin (importar solo desde componentes de cliente). */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number }

export async function postJson<T = Record<string, unknown>>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
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
