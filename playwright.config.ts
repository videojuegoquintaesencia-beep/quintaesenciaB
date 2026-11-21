import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas de extremo a extremo contra `next dev` en el puerto 3107 con su propia base de datos (`data/e2e.db`) y su
 * propio directorio de compilación (`.next-e2e`), para no pisar el servidor de desarrollo habitual (3000 / `.next`).
 *
 *   npm run e2e                                  todo, en los dos proyectos (escritorio y móvil)
 *   npx playwright test tests/e2e/carrito.spec.ts --project=chromium
 *   npx playwright test --trace on               guarda una traza por prueba (ver README, sección "Pruebas")
 */
const PORT = 3107
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Los archivos corren en paralelo (cada prueba crea sus propios datos); dentro de un archivo, en orden.
  fullyParallel: false,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // Sin trazas por defecto (pesan y ralentizan): `npx playwright test --trace on` para depurar.
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    env: { NEXT_DIST_DIR: '.next-e2e', DATABASE_URL: 'file:./data/e2e.db' },
    // En local se reutiliza un servidor ya levantado en el 3107 (con esa misma base de datos); en CI siempre se arranca.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
