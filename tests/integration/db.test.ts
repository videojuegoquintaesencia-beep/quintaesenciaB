/**
 * Integración con la base de datos real (libSQL/SQLite) en memoria: esquema, migraciones, pedidos, ajustes,
 * presupuestos, archivos y límite de accesos. Cada prueba arranca con una base vacía: `getDb` guarda el
 * cliente en `globalThis`, así que se limpia ese estado y se vuelven a importar los módulos.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NewOrderInput, OrderItem } from '@/lib/orders'
import { encodePng } from '../helpers/png'

type Globals = typeof globalThis & { __puDb?: Client; __puDbReady?: Promise<void>; __puSettingsCache?: unknown }
const g = globalThis as Globals

function resetGlobals() {
  g.__puDb?.close()
  delete g.__puDb
  delete g.__puDbReady
  delete g.__puSettingsCache
}

/** Módulos recién importados contra una base de datos nueva. */
async function fresh(url = 'file::memory:') {
  resetGlobals()
  vi.resetModules()
  vi.stubEnv('DATABASE_URL', url)
  vi.stubEnv('DATABASE_AUTH_TOKEN', '')
  const [db, orders, settings, quotes, files, throttle, pricing, settingsSchema] = await Promise.all([
    import('@/lib/db'),
    import('@/lib/orders'),
    import('@/lib/settings'),
    import('@/lib/quotes'),
    import('@/lib/files'),
    import('@/lib/admin/login-throttle'),
    import('@/lib/pricing'),
    import('@/lib/settings-schema'),
  ])
  return { db, orders, settings, quotes, files, throttle, pricing, settingsSchema, client: await db.getDb() }
}

type Fresh = Awaited<ReturnType<typeof fresh>>

const customer = { name: 'Ana López', email: 'ana@example.com', phone: '600112233', company: undefined, taxId: undefined }
const shipping = { name: 'Ana López', line1: 'Calle Mayor 1', line2: undefined, postalCode: '28001', city: 'Madrid', province: 'Madrid', country: 'ES' as const }

function item(over: Partial<OrderItem> = {}): OrderItem {
  return {
    lineId: 'linea1234567',
    productId: 'camiseta',
    productName: 'Camiseta',
    colorId: 'blanco',
    colorName: 'Blanco',
    colorHex: '#FFFFFF',
    sizes: { M: 1 },
    quantity: 1,
    unitBaseCents: 890,
    printCents: 250,
    prints: [{ areaId: 'frente', label: 'Frente', usedCm2: 100, cents: 250 }],
    sizeSurchargeCents: 0,
    grossCents: 1140,
    discountPct: 0,
    discountCents: 0,
    totalCents: 1140,
    design: { v: 1, productId: 'camiseta', colorId: 'blanco', areas: { frente: { layers: [] } } },
    previews: {},
    printFiles: {},
    ...over,
  }
}

function newOrder(over: Partial<NewOrderInput> = {}): NewOrderInput {
  return { customer, shipping, items: [item()], subtotalCents: 1140, shippingCents: 495, totalCents: 1635, vatCents: 284, paymentProvider: 'demo', ...over }
}

let tempDir: string | null = null

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

afterAll(() => {
  resetGlobals()
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

/* ───────────── Esquema y migraciones ───────────── */

describe('esquema', () => {
  it('getDb crea todas las tablas, las columnas añadidas después y sus índices', async () => {
    const { client } = await fresh()
    const tables = (await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)).rows.map((r) => String(r.name))
    for (const t of ['files', 'orders', 'order_events', 'quotes', 'login_attempts', 'admin_state', 'settings', 'counters']) expect(tables).toContain(t)

    const orderColumns = (await client.execute('PRAGMA table_info(orders)')).rows.map((r) => String(r.name))
    for (const c of ['invoice_number', 'invoice_issued_at', 'invoice_json', 'quote_id']) expect(orderColumns).toContain(c)
    const quoteColumns = (await client.execute('PRAGMA table_info(quotes)')).rows.map((r) => String(r.name))
    for (const c of ['public_token', 'proposal_json', 'proposal_sent_at', 'order_id']) expect(quoteColumns).toContain(c)

    const indexes = (await client.execute(`SELECT name FROM sqlite_master WHERE type = 'index'`)).rows.map((r) => String(r.name))
    for (const i of ['idx_orders_invoice', 'idx_orders_quote', 'idx_quotes_order', 'idx_orders_paypal']) expect(indexes).toContain(i)
  })

  it('getDb es idempotente: la segunda llamada devuelve el mismo cliente sin volver a migrar', async () => {
    const { db, client } = await fresh()
    expect(await db.getDb()).toBe(client)
    expect(await db.getDb()).toBe(client)
  })

  it('añade las columnas nuevas a una base creada por una versión anterior, conservando sus filas', async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'pieza-unica-pruebas-'))
    const file = path.join(tempDir, 'antigua.db')
    const old = createClient({ url: `file:${file}` })
    await old.batch(
      [
        `CREATE TABLE orders (
          seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, public_token TEXT NOT NULL, status TEXT NOT NULL,
          customer_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, company TEXT, tax_id TEXT,
          shipping_json TEXT NOT NULL, items_json TEXT NOT NULL, subtotal_cents INTEGER NOT NULL, shipping_cents INTEGER NOT NULL,
          total_cents INTEGER NOT NULL, vat_cents INTEGER NOT NULL, payment_provider TEXT NOT NULL, payment_status TEXT NOT NULL,
          paypal_order_id TEXT, paypal_capture_id TEXT, paid_at TEXT, tracking_code TEXT, carrier TEXT, customer_note TEXT,
          admin_note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
        `CREATE TABLE quotes (
          seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, name TEXT NOT NULL, company TEXT,
          email TEXT NOT NULL, phone TEXT, products_json TEXT NOT NULL, quantity INTEGER, deadline TEXT, message TEXT NOT NULL,
          file_ids_json TEXT NOT NULL, status TEXT NOT NULL, admin_note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
        {
          sql: `INSERT INTO orders (id, public_token, status, customer_name, email, phone, shipping_json, items_json, subtotal_cents,
                  shipping_cents, total_cents, vat_cents, payment_provider, payment_status, created_at, updated_at)
                VALUES ('pedidoantiguo0001', 'token', 'paid', 'Cliente Antiguo', 'antiguo@example.com', '600000000', '{}', '[]',
                  100, 0, 100, 17, 'demo', 'captured', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z')`,
          args: [],
        },
      ],
      'write',
    )
    old.close()

    const { client, orders } = await fresh(`file:${file}`)
    const orderColumns = (await client.execute('PRAGMA table_info(orders)')).rows.map((r) => String(r.name))
    expect(orderColumns).toEqual(expect.arrayContaining(['invoice_number', 'invoice_issued_at', 'invoice_json', 'quote_id']))
    const quoteColumns = (await client.execute('PRAGMA table_info(quotes)')).rows.map((r) => String(r.name))
    expect(quoteColumns).toEqual(expect.arrayContaining(['public_token', 'proposal_json', 'proposal_sent_at', 'order_id']))

    const kept = await orders.getOrderById('pedidoantiguo0001')
    expect(kept?.customerName).toBe('Cliente Antiguo')
    expect((await client.execute(`SELECT invoice_number FROM orders WHERE id = 'pedidoantiguo0001'`)).rows[0].invoice_number).toBeNull()
  })
})

/* ───────────── Pedidos ───────────── */

describe('pedidos', () => {
  let f: Fresh
  beforeEach(async () => {
    f = await fresh()
  })

  it('createOrder guarda el pedido pendiente de pago con su primer evento y lo recupera por id o por enlace con token', async () => {
    const order = await f.orders.createOrder(newOrder({ customerNote: '  Entregar por la tarde  ' }))
    expect(order.number).toBe('PU-1001')
    expect(order.seq).toBe(1)
    expect(order.status).toBe('pending_payment')
    expect(order.payment).toEqual({ provider: 'demo', status: 'created', paypalOrderId: null, paypalCaptureId: null, paidAt: null })
    expect(order.publicToken).toMatch(/^[a-z0-9]{28}$/)
    expect(order.id).toMatch(/^[a-z0-9]{20}$/)
    expect(order.customerNote).toBe('Entregar por la tarde')
    expect(order.company).toBeNull()
    expect(order.shipping).toEqual(shipping)
    expect(order.items).toEqual([item()])
    expect(order.events).toHaveLength(1)
    expect(order.events[0]).toMatchObject({ status: 'pending_payment', note: 'Pedido creado, pendiente de pago', actor: 'customer' })

    expect(await f.orders.getOrderById(order.id)).toEqual(order)
    expect(await f.orders.getOrderByToken(order.id, order.publicToken)).toEqual(order)
  })

  it('getOrderByToken devuelve null con un token incorrecto, de otra longitud o un id inexistente', async () => {
    const order = await f.orders.createOrder(newOrder())
    expect(await f.orders.getOrderByToken(order.id, 'x'.repeat(28))).toBeNull()
    expect(await f.orders.getOrderByToken(order.id, `${order.publicToken}a`)).toBeNull()
    expect(await f.orders.getOrderByToken(order.id, order.publicToken.slice(1))).toBeNull()
    expect(await f.orders.getOrderByToken('noexiste0000000000ab', order.publicToken)).toBeNull()
    expect(await f.orders.getOrderById('noexiste0000000000ab')).toBeNull()
  })

  it('los números de pedido son correlativos y se buscan junto con el email sin distinguir mayúsculas', async () => {
    const a = await f.orders.createOrder(newOrder())
    const b = await f.orders.createOrder(newOrder({ customer: { ...customer, email: 'otro@example.com' } }))
    expect([a.number, b.number]).toEqual(['PU-1001', 'PU-1002'])
    expect((await f.orders.findOrderByNumberAndEmail('PU-1001', ' ANA@Example.com '))?.id).toBe(a.id)
    expect((await f.orders.findOrderByNumberAndEmail('1002', 'otro@example.com'))?.id).toBe(b.id)
    expect(await f.orders.findOrderByNumberAndEmail('PU-1001', 'otro@example.com')).toBeNull()
    expect(await f.orders.findOrderByNumberAndEmail('PU-1003', 'ana@example.com')).toBeNull()
    expect(await f.orders.findOrderByNumberAndEmail('nada', 'ana@example.com')).toBeNull()
  })

  it('markOrderPaid es idempotente: la segunda vez no registra otro evento ni cambia la fecha de pago', async () => {
    const created = await f.orders.createOrder(newOrder())
    const first = await f.orders.markOrderPaid(created.id, { provider: 'demo' })
    expect(first.alreadyPaid).toBe(false)
    expect(first.order.status).toBe('paid')
    expect(first.order.payment).toMatchObject({ provider: 'demo', status: 'captured' })
    expect(first.order.payment.paidAt).toBeTruthy()
    expect(first.order.events).toHaveLength(2)
    expect(first.order.events[1]).toMatchObject({ status: 'paid', note: 'Pago simulado (modo demostración)', actor: 'system' })

    const second = await f.orders.markOrderPaid(created.id, { provider: 'demo' })
    expect(second.alreadyPaid).toBe(true)
    expect(second.order.events).toHaveLength(2)
    expect(second.order.payment.paidAt).toBe(first.order.payment.paidAt)
  })

  it('un pago de PayPal guarda la captura y lo anota el actor "paypal"', async () => {
    const created = await f.orders.createOrder(newOrder({ paymentProvider: 'paypal' }))
    await f.orders.setPayPalOrderId(created.id, 'PP-123')
    const { order } = await f.orders.markOrderPaid(created.id, { provider: 'paypal', captureId: 'CAP-9' })
    expect(order.payment).toMatchObject({ provider: 'paypal', status: 'captured', paypalOrderId: 'PP-123', paypalCaptureId: 'CAP-9' })
    expect(order.events.at(-1)).toMatchObject({ status: 'paid', note: 'Pago confirmado con PayPal', actor: 'paypal' })
    expect((await f.orders.getOrderByPayPalId('PP-123'))?.id).toBe(created.id)
  })

  it('markPaymentFailed deja constancia sin cambiar el estado del pedido', async () => {
    const created = await f.orders.createOrder(newOrder({ paymentProvider: 'paypal' }))
    await f.orders.markPaymentFailed(created.id, 'No se pudo iniciar el pago en PayPal')
    const order = (await f.orders.getOrderById(created.id))!
    expect(order.status).toBe('pending_payment')
    expect(order.payment.status).toBe('failed')
    expect(order.events.at(-1)).toMatchObject({ status: null, note: 'No se pudo iniciar el pago en PayPal', actor: 'paypal' })
  })

  it('updateOrderStatus respeta las transiciones permitidas y rechaza las demás', async () => {
    const created = await f.orders.createOrder(newOrder())
    expect(await f.orders.updateOrderStatus(created.id, 'shipped')).toEqual({ ok: false, error: 'Ese cambio de estado no está permitido' })
    expect(await f.orders.updateOrderStatus(created.id, 'pending_payment')).toEqual({ ok: false, error: 'El pedido ya está en ese estado' })
    expect(await f.orders.updateOrderStatus('noexiste0000000000ab', 'paid')).toEqual({ ok: false, error: 'Pedido no encontrado' })

    // Marcar como pagado a mano (transferencia) también registra el cobro
    const paid = await f.orders.updateOrderStatus(created.id, 'paid', { note: 'Transferencia recibida' })
    expect(paid.ok && paid.order.payment).toMatchObject({ status: 'captured' })
    expect(paid.ok && paid.order.payment.paidAt).toBeTruthy()
    expect(paid.ok && paid.order.events.at(-1)).toMatchObject({ status: 'paid', note: 'Transferencia recibida', actor: 'admin' })

    const production = await f.orders.updateOrderStatus(created.id, 'in_production')
    expect(production.ok && production.order.status).toBe('in_production')

    const shipped = await f.orders.updateOrderStatus(created.id, 'shipped', { trackingCode: ' ABC123 ', carrier: 'SEUR', actor: 'admin' })
    expect(shipped.ok && shipped.order).toMatchObject({ status: 'shipped', trackingCode: 'ABC123', carrier: 'SEUR' })

    // Al entregar no se pisa el seguimiento guardado
    const delivered = await f.orders.updateOrderStatus(created.id, 'delivered')
    expect(delivered.ok && delivered.order).toMatchObject({ status: 'delivered', trackingCode: 'ABC123', carrier: 'SEUR' })
    expect(await f.orders.updateOrderStatus(created.id, 'in_production')).toEqual({ ok: false, error: 'Ese cambio de estado no está permitido' })

    // `force` salta la tabla de transiciones (uso interno)
    const forced = await f.orders.updateOrderStatus(created.id, 'in_production', { force: true })
    expect(forced.ok && forced.order.status).toBe('in_production')
  })

  it('updateAdminNote, updateTracking y addOrderEvent', async () => {
    const created = await f.orders.createOrder(newOrder())
    await f.orders.updateAdminNote(created.id, '  Llamar antes de enviar  ')
    await f.orders.updateTracking(created.id, 'Correos', '  PQ123  ')
    await f.orders.addOrderEvent(created.id, 'Nota interna', 'admin')
    const order = (await f.orders.getOrderById(created.id))!
    expect(order.adminNote).toBe('Llamar antes de enviar')
    expect(order).toMatchObject({ carrier: 'Correos', trackingCode: 'PQ123' })
    expect(order.events.at(-1)).toMatchObject({ status: null, note: 'Nota interna', actor: 'admin' })
    await f.orders.updateAdminNote(created.id, '   ')
    expect((await f.orders.getOrderById(created.id))!.adminNote).toBeNull()
  })

  it('listOrders oculta los pendientes de pago salvo que se pidan, filtra por estado y busca por número, nombre, email o empresa', async () => {
    const pending = await f.orders.createOrder(newOrder({ customer: { ...customer, name: 'Pendiente Pérez', email: 'pendiente@example.com' } }))
    const paidA = await f.orders.createOrder(newOrder({ customer: { ...customer, name: 'Marta Ruiz', email: 'marta@example.com', company: 'Bar La Esquina', taxId: 'B87654321' } }))
    const paidB = await f.orders.createOrder(newOrder({ customer: { ...customer, name: 'Rubén Gil', email: 'ruben@example.com' } }))
    await f.orders.markOrderPaid(paidA.id, { provider: 'demo' })
    await f.orders.markOrderPaid(paidB.id, { provider: 'demo' })
    await f.orders.updateOrderStatus(paidB.id, 'in_production')
    await f.orders.updateOrderStatus(paidB.id, 'shipped')
    await f.orders.updateOrderStatus(paidB.id, 'delivered')

    const defaults = await f.orders.listOrders()
    expect(defaults.total).toBe(2)
    expect(defaults.rows.map((r) => r.id)).toEqual([paidB.id, paidA.id]) // más reciente primero
    expect(defaults.rows[1]).toMatchObject({ number: 'PU-1002', customerName: 'Marta Ruiz', company: 'Bar La Esquina', units: 1, totalCents: 1635 })

    expect((await f.orders.listOrders({ includeUnpaid: true })).total).toBe(3)
    // "Todos" sigue ocultando los carritos sin pagar salvo que se pidan expresamente (así lo hace el panel)
    expect((await f.orders.listOrders({ status: 'all' })).total).toBe(2)
    expect((await f.orders.listOrders({ status: 'all', includeUnpaid: true })).total).toBe(3)
    expect((await f.orders.listOrders({ status: 'open' })).rows.map((r) => r.id)).toEqual([paidA.id]) // el entregado ya no está "en curso"
    expect((await f.orders.listOrders({ status: 'active' })).rows.map((r) => r.id)).toEqual([paidA.id])
    expect((await f.orders.listOrders({ status: 'delivered' })).rows.map((r) => r.id)).toEqual([paidB.id])
    expect((await f.orders.listOrders({ status: 'pending_payment' })).rows.map((r) => r.id)).toEqual([pending.id])

    expect((await f.orders.listOrders({ q: 'PU-1002', status: 'all' })).rows.map((r) => r.id)).toEqual([paidA.id])
    expect((await f.orders.listOrders({ q: '1003', status: 'all' })).rows.map((r) => r.id)).toEqual([paidB.id])
    expect((await f.orders.listOrders({ q: 'marta', status: 'all' })).rows.map((r) => r.id)).toEqual([paidA.id])
    expect((await f.orders.listOrders({ q: 'ruben@', status: 'all' })).rows.map((r) => r.id)).toEqual([paidB.id])
    expect((await f.orders.listOrders({ q: 'esquina', status: 'all' })).rows.map((r) => r.id)).toEqual([paidA.id])
    expect((await f.orders.listOrders({ q: '%', status: 'all' })).total).toBe(0) // los comodines se escapan
    expect((await f.orders.listOrders({ q: 'nadie', status: 'all' })).total).toBe(0)

    const page = await f.orders.listOrders({ status: 'all', includeUnpaid: true, limit: 1, offset: 1 })
    expect(page.total).toBe(3)
    expect(page.rows.map((r) => r.id)).toEqual([paidA.id])
  })

  it('getOrderStats cuenta por estado y suma solo los pedidos cobrados', async () => {
    const a = await f.orders.createOrder(newOrder())
    const b = await f.orders.createOrder(newOrder({ totalCents: 2000 }))
    await f.orders.createOrder(newOrder())
    await f.orders.markOrderPaid(a.id, { provider: 'demo' })
    await f.orders.markOrderPaid(b.id, { provider: 'demo' })
    await f.orders.updateOrderStatus(b.id, 'cancelled')
    const stats = await f.orders.getOrderStats()
    expect(stats.countsByStatus).toMatchObject({ pending_payment: 1, paid: 1, cancelled: 1 })
    expect(stats.toProcess).toBe(1)
    expect(stats.revenueTotalCents).toBe(1635)
    expect(stats.orders30d).toBe(1)
    expect(stats.revenue30dCents).toBe(1635)
  })

  it('purgeUnpaidOrders borra los pendientes de pago antiguos con sus eventos y respeta los pagados', async () => {
    const pending = await f.orders.createOrder(newOrder())
    const paid = await f.orders.createOrder(newOrder())
    await f.orders.markOrderPaid(paid.id, { provider: 'demo' })
    // Plazo negativo: "antiguo" es cualquier pedido creado antes de dentro de un día (evita depender del reloj).
    // El parámetro está tipado como el literal 30 (el valor por defecto sale de `site`, que es `as const`): se ensancha aquí.
    const purge = f.orders.purgeUnpaidOrders as (maxAgeDays?: number, batch?: number) => Promise<number>
    expect(await purge(-1)).toBe(1)
    expect(await f.orders.getOrderById(pending.id)).toBeNull()
    expect(await f.orders.getOrderById(paid.id)).not.toBeNull()
    expect((await f.client.execute({ sql: 'SELECT COUNT(*) AS n FROM order_events WHERE order_id = ?', args: [pending.id] })).rows[0].n).toBe(0)
    expect(await purge(-1)).toBe(0)
  })
})

/* ───────────── Archivos ───────────── */

describe('archivos', () => {
  it('saveFile/getFile, metadatos, tamaños de PNG y asociación a un pedido', async () => {
    const f = await fresh()
    const png = encodePng({ width: 12, height: 8 })
    const { id } = await f.files.saveFile({ kind: 'print', name: 'frente.png', mime: 'image/png', bytes: png })
    const stored = (await f.files.getFile(id))!
    expect(stored).toMatchObject({ kind: 'print', name: 'frente.png', mime: 'image/png', size: png.length, orderId: null, quoteId: null })
    expect(Buffer.from(stored.bytes).equals(Buffer.from(png))).toBe(true)
    expect(await f.files.getFileMetas([id, 'inexistente000000'])).toHaveLength(1)
    expect((await f.files.getPngSizes([id])).get(id)).toEqual({ width: 12, height: 8, dpi: null })
    expect(await f.files.unattachedBytes()).toBe(png.length)

    const order = await f.orders.createOrder(newOrder({ items: [item({ printFiles: { frente: id } })] }))
    expect((await f.files.getFile(id))!.orderId).toBe(order.id)
    expect(f.orders.orderFileIds(order)).toEqual([id])
    expect(await f.files.unattachedBytes()).toBe(0)
  })

  it('purgeOrphanFiles solo borra los archivos sin pedido ni presupuesto', async () => {
    const f = await fresh()
    const png = encodePng({ width: 2, height: 2 })
    const orphan = await f.files.saveFile({ kind: 'artwork', mime: 'image/png', bytes: png })
    const attached = await f.files.saveFile({ kind: 'artwork', mime: 'image/png', bytes: png })
    await f.files.attachFiles({ quoteId: 'presupuesto000000001' }, [attached.id])
    expect(await f.files.purgeOrphanFiles(-1)).toBe(1)
    expect(await f.files.getFile(orphan.id)).toBeNull()
    expect(await f.files.getFile(attached.id)).not.toBeNull()
  })

  it('getFile devuelve null para ids desconocidos', async () => {
    const f = await fresh()
    expect(await f.files.getFile('noexiste0000000000ab')).toBeNull()
  })
})

/* ───────────── Ajustes ───────────── */

describe('ajustes guardados en la base de datos', () => {
  it('sin nada guardado devuelve los valores por defecto y ninguna sección personalizada', async () => {
    const f = await fresh()
    expect(await f.settings.getSettings()).toEqual(f.settingsSchema.DEFAULT_SETTINGS)
    expect(await f.settings.getOverriddenSections()).toEqual([])
    expect((await f.settings.getCatalog()).products.map((p) => p.basePriceCents)).toEqual(f.settingsSchema.DEFAULT_CATALOG.products.map((p) => p.basePriceCents))
  })

  it('saveSettingsSection valida, guarda e invalida la caché; resetSettingsSection vuelve a los valores por defecto', async () => {
    const f = await fresh()
    const defaults = f.settingsSchema.DEFAULT_SETTINGS
    await f.settings.getSettings() // llena la caché
    await f.settings.saveSettingsSection('shipping', { ...defaults.shipping, flatCents: 300 })
    expect((await f.settings.getSettings()).shipping.flatCents).toBe(300)
    expect((await f.settings.getCatalog()).shipping.flatCents).toBe(300)
    expect(await f.settings.getOverriddenSections()).toEqual(['shipping'])
    expect(f.pricing.computeShippingCents(1000, '28001', (await f.settings.getCatalog()).shipping)).toBe(300)

    await f.settings.resetSettingsSection('shipping')
    expect((await f.settings.getSettings()).shipping.flatCents).toBe(495)
    expect(await f.settings.getOverriddenSections()).toEqual([])
  })

  it('un valor inválido no se guarda (lanza) y el anterior se conserva', async () => {
    const f = await fresh()
    const defaults = f.settingsSchema.DEFAULT_SETTINGS
    await f.settings.saveSettingsSection('production', { leadDaysMin: 3, leadDaysMax: 5 })
    await expect(f.settings.saveSettingsSection('production', { leadDaysMin: 9, leadDaysMax: 2 })).rejects.toThrow()
    await expect(f.settings.saveSettingsSection('shipping', { ...defaults.shipping, flatCents: -1 })).rejects.toThrow()
    expect((await f.settings.getSettings()).production).toEqual({ leadDaysMin: 3, leadDaysMax: 5 })
  })

  it('los precios guardados cambian el catálogo efectivo y, con él, el precio de una línea', async () => {
    const f = await fresh()
    const pricing = structuredClone(f.settingsSchema.DEFAULT_SETTINGS.pricing)
    pricing.products.camiseta!.basePriceCents = 1500
    await f.settings.saveSettingsSection('pricing', pricing)
    const catalog = await f.settings.getCatalog()
    expect(catalog.products.find((p) => p.id === 'camiseta')!.basePriceCents).toBe(1500)
    const design = {
      v: 1 as const,
      productId: 'camiseta' as const,
      colorId: 'blanco',
      areas: { frente: { layers: [{ id: 't1', type: 'text' as const, x: 15, y: 20, width: 10, height: 10, rotation: 0, text: 'Hola', font: 'fredoka' as const, sizeCm: 2, fill: '#1b1340', align: 'center' as const }] } },
    }
    const price = f.pricing.priceLine({ productId: 'camiseta', colorId: 'blanco', sizes: { M: 1 }, design }, catalog)
    expect(price.ok && price.totalCents).toBe(1500 + 250)
  })

  it('la caché por instancia solo se refresca al invalidar (o al caducar)', async () => {
    const f = await fresh()
    await f.settings.getSettings()
    await f.client.execute({
      sql: `INSERT INTO settings (key, value, updated_at) VALUES ('production', ?, ?)`,
      args: [JSON.stringify({ leadDaysMin: 7, leadDaysMax: 9 }), new Date().toISOString()],
    })
    expect((await f.settings.getSettings()).production.leadDaysMin).toBe(2) // sigue cacheado
    f.settings.invalidateSettingsCache()
    expect((await f.settings.getSettings()).production).toEqual({ leadDaysMin: 7, leadDaysMax: 9 })
  })

  it('una fila corrupta (JSON roto o formato inválido) se ignora con un aviso y no rompe la tienda', async () => {
    const f = await fresh()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const now = new Date().toISOString()
    await f.client.batch(
      [
        { sql: `INSERT INTO settings (key, value, updated_at) VALUES ('contact', ?, ?)`, args: ['{esto no es json', now] },
        { sql: `INSERT INTO settings (key, value, updated_at) VALUES ('shipping', ?, ?)`, args: [JSON.stringify({ flatCents: 'gratis' }), now] },
        { sql: `INSERT INTO settings (key, value, updated_at) VALUES ('desconocida', ?, ?)`, args: ['{}', now] },
      ],
      'write',
    )
    f.settings.invalidateSettingsCache()
    const settings = await f.settings.getSettings()
    expect(settings.contact).toEqual(f.settingsSchema.DEFAULT_SETTINGS.contact)
    expect(settings.shipping).toEqual(f.settingsSchema.DEFAULT_SETTINGS.shipping)
    expect(await f.settings.getOverriddenSections()).toEqual([])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"contact"'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('shipping'))
  })
})

/* ───────────── Presupuestos y mensajes ───────────── */

describe('presupuestos y mensajes de contacto', () => {
  it('createQuote y createContactMessage comparten numeración con prefijos distintos y se listan y filtran', async () => {
    const f = await fresh()
    const quote = await f.quotes.createQuote({
      name: 'Lorena Prieto',
      company: 'Cervecería Norte',
      email: 'lorena@example.com',
      phone: '',
      products: ['camiseta', 'gorra'],
      quantity: 80,
      deadline: '2026-12-20',
      message: 'Queremos uniformar al equipo.',
      fileIds: [],
      consent: true,
    })
    expect(quote).toMatchObject({ number: 'PR-1001', kind: 'quote', status: 'new', company: 'Cervecería Norte', phone: null, products: ['camiseta', 'gorra'], quantity: 80, deadline: '2026-12-20', fileIds: [] })

    const message = await f.quotes.createContactMessage({ name: 'Lucía', email: 'lucia@example.com', message: '¿Hacéis bolsas de tela?', consent: true, phone: '600112233' })
    expect(message).toMatchObject({ number: 'MS-1002', kind: 'contact', status: 'new', products: [], quantity: null, deadline: null, phone: '600112233', company: null })

    expect(await f.quotes.countNewQuotes()).toBe(2)
    expect((await f.quotes.listQuotes()).rows.map((q) => q.number)).toEqual(['MS-1002', 'PR-1001'])
    expect((await f.quotes.listQuotes({ kind: 'quote' })).rows.map((q) => q.number)).toEqual(['PR-1001'])
    expect((await f.quotes.listQuotes({ kind: 'contact' })).rows.map((q) => q.number)).toEqual(['MS-1002'])
    expect((await f.quotes.listQuotes({ q: 'PR-1001' })).rows.map((q) => q.number)).toEqual(['PR-1001'])
    expect((await f.quotes.listQuotes({ q: 'MS-1002' })).rows.map((q) => q.number)).toEqual(['MS-1002'])
    expect((await f.quotes.listQuotes({ q: '1001' })).rows.map((q) => q.number)).toEqual(['PR-1001'])
    expect((await f.quotes.listQuotes({ q: 'bolsas' })).rows.map((q) => q.number)).toEqual(['MS-1002'])
    expect((await f.quotes.listQuotes({ q: 'cervecería' })).rows.map((q) => q.number)).toEqual(['PR-1001'])
    expect((await f.quotes.listQuotes({ q: 'nadie' })).total).toBe(0)
  })

  it('updateQuote cambia estado y nota, y los filtros de estado los reflejan', async () => {
    const f = await fresh()
    const quote = await f.quotes.createQuote({ name: 'Nuria', email: 'nuria@example.com', products: ['hoodie'], quantity: 120, message: 'Sudaderas para el colegio.', fileIds: [], consent: true })
    const updated = await f.quotes.updateQuote(quote.id, { status: 'won', adminNote: '  Pedido cerrado  ' })
    expect(updated).toMatchObject({ status: 'won', adminNote: 'Pedido cerrado' })
    expect(await f.quotes.countNewQuotes()).toBe(0)
    expect((await f.quotes.listQuotes({ status: 'active' })).total).toBe(0)
    expect((await f.quotes.listQuotes({ status: 'won' })).total).toBe(1)
    expect((await f.quotes.updateQuote(quote.id, { adminNote: '' }))?.adminNote).toBeNull()
    expect(await f.quotes.updateQuote('noexiste0000000000ab', { status: 'lost' })).toBeNull()
  })

  it('los archivos adjuntos quedan asociados al presupuesto', async () => {
    const f = await fresh()
    const { id } = await f.files.saveFile({ kind: 'quote', mime: 'image/png', bytes: encodePng({ width: 2, height: 2 }) })
    const quote = await f.quotes.createQuote({ name: 'Nuria', email: 'nuria@example.com', products: ['taza'], quantity: 10, message: 'Tazas con el logo adjunto.', fileIds: [id], consent: true })
    expect(quote.fileIds).toEqual([id])
    expect((await f.files.getFile(id))!.quoteId).toBe(quote.id)
  })
})

/* ───────────── Límite de accesos al panel ───────────── */

describe('límite de intentos de acceso al panel', () => {
  it('permite 5 intentos por IP en 15 minutos y después dice cuánto esperar; el acierto libera la IP', async () => {
    const f = await fresh()
    const now = Date.now()
    for (let i = 0; i < 5; i++) expect((await f.throttle.beginLoginAttempt('1.1.1.1', now)).allowed).toBe(true)
    const blocked = await f.throttle.beginLoginAttempt('1.1.1.1', now + 60_000)
    expect(blocked.allowed).toBe(false)
    if (!blocked.allowed) expect(blocked.retryAfterSec).toBe(14 * 60)
    // Otra IP no está afectada
    const other = await f.throttle.beginLoginAttempt('2.2.2.2', now)
    expect(other.allowed).toBe(true)
    // Acierto: se libera el intento y se limpian los fallos de esa IP
    if (other.allowed) await f.throttle.releaseLoginAttempt(other.id, '1.1.1.1')
    expect((await f.throttle.beginLoginAttempt('1.1.1.1', now + 60_000)).allowed).toBe(true)
  })

  it('el tope global de 30 intentos no depende de la IP', async () => {
    const f = await fresh()
    const now = Date.now()
    for (let i = 0; i < 30; i++) expect((await f.throttle.beginLoginAttempt(`10.0.0.${i}`, now)).allowed).toBe(true)
    expect((await f.throttle.beginLoginAttempt('10.0.1.1', now)).allowed).toBe(false)
    // Los intentos caducados se purgan y todo vuelve a empezar
    await f.throttle.purgeLoginAttempts(now + f.throttle.LOGIN_WINDOW_MS + 1)
    expect((await f.throttle.beginLoginAttempt('10.0.1.1', now + f.throttle.LOGIN_WINDOW_MS + 1)).allowed).toBe(true)
  })
})
