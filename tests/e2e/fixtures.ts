import { test as base, expect } from '@playwright/test'

let counter = 0

/** IP de prueba distinta cada vez (rango 10.x.y.z): el servidor la lee de X-Forwarded-For. */
function uniqueIp(): string {
  const n = (Date.now() + counter++ * 7919) % 0xffffff
  return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`
}

/**
 * `test` de la tienda: cada prueba se presenta al servidor con una IP distinta. Los límites de peticiones por IP
 * (pedidos, formularios, subidas, intentos de acceso al panel) viven en memoria del servidor y no deben acumularse
 * entre pruebas ni entre ejecuciones contra el mismo servidor reutilizado. El contexto del navegador es nuevo en
 * cada prueba, así que localStorage (carrito y borradores) empieza vacío.
 */
export const test = base.extend({
  // El segundo parámetro se llama `use` en la documentación de Playwright; aquí `provide` para no confundir a la regla de hooks de React.
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide) => {
    await provide({ ...extraHTTPHeaders, 'x-forwarded-for': uniqueIp() })
  },
})

export { expect }

/** true en el proyecto móvil (Pixel 7): algunos flujos cambian de disposición. */
export const isMobile = () => test.info().project.name === 'movil'

/** URL base del servidor de pruebas (para cabeceras Origin, etc.). */
export const baseURL = () => test.info().project.use.baseURL ?? 'http://localhost:3107'
