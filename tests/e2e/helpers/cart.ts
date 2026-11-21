/**
 * Carrito de pruebas: líneas con archivos REALES subidos al servidor (vista previa y PNG de impresión) para que el
 * carrito, el checkout y el panel se comporten como con un diseño hecho en el editor, sin pasar por el editor.
 */
import type { APIRequestContext, Page } from '@playwright/test'
import type { CartLine } from '@/lib/cart-store'
import type { Design } from '@/lib/design'
import { newId } from '@/lib/ids'
import { encodePng } from '../../helpers/png'

/** Clave de `zustand/persist` del carrito (ver `src/lib/cart-store.ts`). */
export const CART_KEY = 'pieza-unica-cart-v1'

/** Caja del texto del diseño de pruebas, en cm: 20 × 5 = 100 cm² → escalón más barato del frente (2,50 €). */
export const TEXT_BOX = { wCm: 20, hCm: 5 }

/** Camiseta blanca con un texto "HOLA" centrado en el frente: 8,90 € + 2,50 € = 11,40 € por unidad. */
export const TEXT_DESIGN: Design = {
  v: 1,
  productId: 'camiseta',
  colorId: 'blanco',
  areas: {
    frente: {
      layers: [
        { id: 'texto-e2e1', type: 'text', x: 15, y: 20, width: TEXT_BOX.wCm, height: TEXT_BOX.hCm, rotation: 0, text: 'HOLA', font: 'fredoka', sizeCm: 4, fill: '#1b1340', align: 'center', bold: true },
      ],
    },
  },
}

/** Sube un PNG transparente de `width × height` con el tipo indicado y devuelve su id. */
export async function uploadPng(request: APIRequestContext, kind: 'preview' | 'print' | 'artwork', width: number, height: number, name: string): Promise<string> {
  const res = await request.post('/api/uploads', {
    multipart: { kind, file: { name, mimeType: 'image/png', buffer: Buffer.from(encodePng({ width, height })) } },
  })
  if (!res.ok()) throw new Error(`No se pudo subir ${name} (${res.status()}): ${await res.text()}`)
  return ((await res.json()) as { id: string }).id
}

/**
 * Línea de carrito completa. El PNG de impresión mide la caja del diseño a 150 ppp (el mínimo que acepta el servidor:
 * 20 cm → 1182 px, 5 cm → 296 px), lo bastante pequeño para subirlo en milisegundos.
 */
export async function buildCartLine(request: APIRequestContext, over: { sizes?: Record<string, number>; note?: string } = {}): Promise<CartLine> {
  const [preview, print] = await Promise.all([
    uploadPng(request, 'preview', 300, 350, 'camiseta-front-vista.png'),
    uploadPng(request, 'print', 1182, 296, 'camiseta-frente-20x5cm.png'),
  ])
  return {
    id: newId(12),
    productId: 'camiseta',
    colorId: 'blanco',
    sizes: over.sizes ?? { M: 1 },
    design: TEXT_DESIGN,
    previews: { front: preview },
    printFiles: { frente: print },
    note: over.note,
    addedAt: Date.now(),
  }
}

/** Deja estas líneas en el carrito del navegador (localStorage) y recarga para que la tienda las lea. */
export async function seedCart(page: Page, lines: CartLine[], path = '/carrito'): Promise<void> {
  await page.goto(path)
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [CART_KEY, JSON.stringify({ state: { lines }, version: 1 })] as const)
  await page.reload()
}

/** Líneas que el navegador tiene guardadas en el carrito. */
export async function readCart(page: Page): Promise<CartLine[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? ((JSON.parse(raw) as { state: { lines: CartLine[] } }).state.lines ?? []) : []
  }, CART_KEY)
}

/** Cuerpo de POST /api/checkout para una línea (lo mismo que envía el navegador). */
export function checkoutPayload(line: CartLine, over: { email?: string; name?: string; postalCode?: string; city?: string; province?: string; note?: string } = {}) {
  const name = over.name ?? 'Ana Prueba'
  return {
    lines: [{ id: line.id, productId: line.productId, colorId: line.colorId, sizes: line.sizes, design: line.design, previews: line.previews, printFiles: line.printFiles, note: line.note }],
    customer: { name, email: over.email ?? uniqueEmail('cliente'), phone: '600112233', company: '', taxId: '' },
    shipping: { name, line1: 'Calle Mayor 1', line2: '', postalCode: over.postalCode ?? '28001', city: over.city ?? 'Madrid', province: over.province ?? 'Madrid', country: 'ES' as const },
    note: over.note ?? '',
    consents: { terms: true, privacy: true, noWithdrawal: true, artworkRights: true },
  }
}

/** Email único por prueba (dominio reservado .example: nunca recibe correo). */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@e2e.example`
}
