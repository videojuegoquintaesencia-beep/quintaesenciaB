import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

/** axe-core no es dependencia del proyecto: se usa si está en node_modules y, si no, las pruebas se omiten. */
export const AXE_PATH = path.resolve(__dirname, '../../../node_modules/axe-core/axe.min.js')
export const axeAvailable = existsSync(AXE_PATH)

export interface AxeViolation {
  id: string
  impact: string | null
  help: string
  nodes: string[]
}

interface AxeResults {
  violations: { id: string; impact?: string | null; help: string; nodes: { target: string[] }[] }[]
}

interface AxeGlobal {
  run: (context: Document, options: unknown) => Promise<AxeResults>
}

/**
 * Ejecuta axe (WCAG 2.0/2.1 A y AA) en la página actual y devuelve solo las violaciones graves o críticas,
 * con los primeros nodos afectados para que el fallo sea legible.
 */
export async function seriousViolations(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_PATH })
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: AxeGlobal }).axe
    const results = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    })
    return results.violations.map((v) => ({ id: v.id, impact: v.impact ?? null, help: v.help, nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) }))
  })
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

export function describeViolations(violations: AxeViolation[]): string {
  return violations.map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.join('\n    ')}`).join('\n')
}
