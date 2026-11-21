import type { Page } from '@playwright/test'

/** Recoge los errores de consola y las excepciones no capturadas de la página desde este momento. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(`Excepción: ${err.message}`))
  return errors
}
