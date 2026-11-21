import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': `${root}src`,
      // Fuera de React Server Components el paquete `server-only` lanza al importarse: en las pruebas se sustituye
      // por un módulo vacío para poder cargar `lib/db`, `lib/orders`, etc. en Node.
      'server-only': `${root}tests/stubs/server-only.ts`,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'src/**/*.test.ts'],
    // Cada archivo corre en su propio proceso: las pruebas de integración tocan `globalThis.__puDb` y no deben pisarse.
    isolate: true,
    testTimeout: 20_000,
    reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
  },
})
