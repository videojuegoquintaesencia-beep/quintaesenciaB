/**
 * Guardar y restablecer secciones de ajustes desde el panel (/api/admin/settings/[section]).
 * Importar solo desde componentes de cliente. Los formularios envían SIEMPRE la sección completa.
 */
import type { SettingsSection } from '@/lib/settings-schema'
import { postJson, type ApiResult } from './client'

export function saveSettingsSection(section: SettingsSection, value: unknown): Promise<ApiResult<{ ok: true }>> {
  return postJson(`/api/admin/settings/${section}`, value)
}

/** DELETE: la sección vuelve a los valores por defecto definidos en código. */
export async function resetSettingsSection(section: SettingsSection): Promise<ApiResult<{ ok: true }>> {
  try {
    const res = await fetch(`/api/admin/settings/${section}`, { method: 'DELETE' })
    const data = (await res.json().catch(() => null)) as { ok?: true; error?: string } | null
    if (res.status === 401) return { ok: false, status: 401, error: 'Tu sesión ha caducado. Vuelve a entrar en el panel.' }
    if (!res.ok || !data) return { ok: false, status: res.status, error: data?.error ?? 'No se pudo completar la acción. Inténtalo de nuevo.' }
    return { ok: true, data: { ok: true } }
  } catch {
    return { ok: false, status: 0, error: 'Sin conexión con el servidor. Comprueba tu red e inténtalo de nuevo.' }
  }
}
