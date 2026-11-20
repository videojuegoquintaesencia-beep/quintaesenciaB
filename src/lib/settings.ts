/**
 * Ajustes del negocio guardados en la base de datos (tabla `settings`, una fila por sección en JSON).
 * Solo servidor. Los tipos, esquemas y valores por defecto están en `./settings-schema.ts`.
 *
 * Lectura: `getSettings()` (ajustes efectivos) y `getCatalog()` (productos con los precios aplicados, envíos y
 * plazos). Se cachean en memoria unos segundos por instancia y se invalidan al guardar desde el panel; con
 * varias instancias, las demás tardan como mucho `TTL_MS` en ver el cambio.
 */
import 'server-only'
import { cache } from 'react'
import { getDb, nowIso } from './db'
import {
  DEFAULT_SETTINGS,
  SECTION_SCHEMAS,
  SETTINGS_SECTIONS,
  catalogFromSettings,
  isSettingsSection,
  mergeSettings,
  type Catalog,
  type Settings,
  type SettingsSection,
} from './settings-schema'

const TTL_MS = 30_000

interface CacheEntry {
  settings: Settings
  catalog: Catalog
  /** Secciones que tienen valores guardados en el panel (y válidos). */
  overridden: SettingsSection[]
  at: number
}

type G = typeof globalThis & { __puSettingsCache?: CacheEntry }
const g = globalThis as G

async function loadOverrides(): Promise<Partial<Record<SettingsSection, unknown>>> {
  const db = await getDb()
  const res = await db.execute('SELECT key, value FROM settings')
  const overrides: Partial<Record<SettingsSection, unknown>> = {}
  for (const row of res.rows) {
    const key = String(row.key)
    if (!isSettingsSection(key)) continue
    try {
      overrides[key] = JSON.parse(String(row.value))
    } catch {
      console.warn(`[ajustes] La sección "${key}" guardada no es JSON válido; se usan los valores por defecto.`)
    }
  }
  return overrides
}

/** Una sola lectura por petición (React `cache`) y una caché corta por instancia. */
const loadEntry = cache(async (): Promise<CacheEntry> => {
  const hit = g.__puSettingsCache
  if (hit && Date.now() - hit.at < TTL_MS) return hit

  let overrides: Partial<Record<SettingsSection, unknown>>
  try {
    overrides = await loadOverrides()
  } catch (err) {
    // Durante `next build` puede no haber base de datos: las páginas estáticas se generan con los valores en
    // código y se revalidan al guardar ajustes. En ejecución el error se propaga (igual que el resto de la app).
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('[ajustes] Sin acceso a la base de datos durante la compilación; se usan los valores por defecto.')
      return { settings: DEFAULT_SETTINGS, catalog: catalogFromSettings(DEFAULT_SETTINGS), overridden: [], at: 0 }
    }
    throw err
  }

  const { settings, invalid } = mergeSettings(overrides)
  if (invalid.length > 0) {
    console.warn(`[ajustes] Secciones guardadas con un formato no válido (se usan los valores por defecto): ${invalid.join(', ')}`)
  }
  const entry: CacheEntry = {
    settings,
    catalog: catalogFromSettings(settings),
    overridden: SETTINGS_SECTIONS.filter((s) => overrides[s] !== undefined && !invalid.includes(s)),
    at: Date.now(),
  }
  g.__puSettingsCache = entry
  return entry
})

/** Ajustes efectivos: valores por defecto en código + lo guardado en el panel. */
export async function getSettings(): Promise<Settings> {
  return (await loadEntry()).settings
}

/** Productos con los precios efectivos, descuentos por volumen, envíos y plazos. */
export async function getCatalog(): Promise<Catalog> {
  return (await loadEntry()).catalog
}

/** Secciones con valores guardados en el panel (para mostrar "personalizado" / "por defecto"). */
export async function getOverriddenSections(): Promise<SettingsSection[]> {
  return (await loadEntry()).overridden
}

/** Guarda una sección completa (ya validada o no: aquí se vuelve a validar) y vacía la caché. */
export async function saveSettingsSection(section: SettingsSection, value: unknown): Promise<void> {
  const parsed = SECTION_SCHEMAS[section].parse(value)
  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [section, JSON.stringify(parsed), nowIso()],
  })
  invalidateSettingsCache()
}

/** Borra lo guardado de una sección: vuelve a los valores por defecto en código. */
export async function resetSettingsSection(section: SettingsSection): Promise<void> {
  const db = await getDb()
  await db.execute({ sql: 'DELETE FROM settings WHERE key = ?', args: [section] })
  invalidateSettingsCache()
}

export function invalidateSettingsCache(): void {
  g.__puSettingsCache = undefined
}
