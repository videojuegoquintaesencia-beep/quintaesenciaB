import type { FullConfig } from '@playwright/test'
import { resetDatabase } from './helpers/db'

/**
 * Se ejecuta una vez por ejecución, con el servidor ya levantado (Playwright arranca `webServer` antes).
 * Deja la base de datos de pruebas con el esquema creado y vacía: cada prueba crea después sus propios datos.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3107'
  // El servidor crea el esquema en la primera consulta. Este id no existe (404), pero la petición toca la base.
  const res = await fetch(`${baseURL}/api/files/aaaaaaaaaaaaaaaa`)
  if (res.status !== 404) throw new Error(`El servidor de pruebas en ${baseURL} no responde como se esperaba (${res.status}).`)
  await resetDatabase()
}
