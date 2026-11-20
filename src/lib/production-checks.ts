/**
 * Comprobación de la configuración de producción con los ajustes EFECTIVOS: lo que la dueña haya guardado en el
 * panel (tabla `settings`) sobre los valores en código. `auth-config.ts` no puede leer la base de datos (lo usa
 * `proxy.ts`), así que la lectura de los ajustes vive aquí, solo para el servidor Node (instrumentation).
 */
import 'server-only'
import { productionConfigIssues } from './auth-config'
import { getSettings } from './settings'

export type ConfigIssue = ReturnType<typeof productionConfigIssues>[number]

export async function productionConfigIssuesWithSettings(): Promise<ConfigIssue[]> {
  // Fuera de producción no hay avisos: no merece la pena abrir la base de datos al arrancar.
  if (process.env.NODE_ENV !== 'production') return []
  try {
    const { business, contact } = await getSettings()
    return productionConfigIssues({ business, contact })
  } catch (err) {
    // Sin base de datos al arrancar se comprueban los valores en código y se avisa de que faltó la lectura.
    const reason = err instanceof Error ? err.message : String(err)
    return [
      ...productionConfigIssues(),
      { level: 'warn', message: `No se pudieron leer los ajustes guardados en el panel al arrancar (${reason}); se han comprobado los valores en código.` },
    ]
  }
}
