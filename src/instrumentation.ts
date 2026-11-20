/**
 * Se ejecuta una vez al arrancar el servidor (no durante `next build`). Comprueba la configuración de
 * producción, con los ajustes guardados en el panel, y escribe en el registro, bien visibles, los problemas
 * de seguridad que encuentre.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  const { productionConfigIssuesWithSettings } = await import('./lib/production-checks')
  const issues = await productionConfigIssuesWithSettings()
  if (issues.length === 0) return
  const bar = '='.repeat(72)
  console.error(`\n${bar}\n[CONFIGURACIÓN DE PRODUCCIÓN] Revisa estos puntos antes de recibir clientes:`)
  for (const issue of issues) console.error(` ${issue.level === 'error' ? '✖ ERROR' : '⚠ AVISO'}: ${issue.message}`)
  console.error(`${bar}\n`)
}
