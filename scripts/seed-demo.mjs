#!/usr/bin/env node
/**
 * Datos de demostración para probar el panel de administración.
 *
 *   npm run seed:demo              crea 6 pedidos, 2 presupuestos y 1 mensaje (si no existen ya)
 *   npm run seed:demo -- --force   borra los datos de demostración anteriores y los vuelve a crear
 *
 * Usa DATABASE_URL como la aplicación (por defecto file:./data/pieza-unica.db). Los pedidos de demostración
 * se reconocen por el dominio de email @demo.piezaunica.test, así que nunca toca datos reales.
 * Los PNG (previsualizaciones, archivos de impresión y artes) se generan aquí mismo, sin dependencias.
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { deflateSync } from 'node:zlib'
import { createClient } from '@libsql/client'

const FORCE = process.argv.includes('--force')
const DEMO_DOMAIN = '@demo.piezaunica.test'
const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/pieza-unica.db'

/* ───────────── Base de datos (mismo esquema que src/lib/db.ts) ───────────── */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT, mime TEXT NOT NULL, size INTEGER NOT NULL,
    data BLOB NOT NULL, order_id TEXT, quote_id TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_files_order ON files(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_files_quote ON files(quote_id)`,
  `CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at)`,
  `CREATE TABLE IF NOT EXISTS orders (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, public_token TEXT NOT NULL, status TEXT NOT NULL,
    customer_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, company TEXT, tax_id TEXT,
    shipping_json TEXT NOT NULL, items_json TEXT NOT NULL, subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL, total_cents INTEGER NOT NULL, vat_cents INTEGER NOT NULL,
    payment_provider TEXT NOT NULL, payment_status TEXT NOT NULL, paypal_order_id TEXT, paypal_capture_id TEXT,
    paid_at TEXT, tracking_code TEXT, carrier TEXT, customer_note TEXT, admin_note TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paypal ON orders(paypal_order_id) WHERE paypal_order_id IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS order_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, status TEXT, note TEXT, actor TEXT NOT NULL,
    created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id)`,
  `CREATE TABLE IF NOT EXISTS quotes (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, name TEXT NOT NULL,
    company TEXT, email TEXT NOT NULL, phone TEXT, products_json TEXT NOT NULL, quantity INTEGER, deadline TEXT,
    message TEXT NOT NULL, file_ids_json TEXT NOT NULL, status TEXT NOT NULL, admin_note TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)`,
  `CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at)`,
]

if (DATABASE_URL.startsWith('file:') && !DATABASE_URL.includes(':memory:')) {
  mkdirSync(dirname(DATABASE_URL.slice('file:'.length).replace(/^\/\//, '')), { recursive: true })
}
const db = createClient({ url: DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN || undefined })
await db.batch(SCHEMA, 'write')

/* ───────────── Utilidades ───────────── */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const newId = (length = 20) => Array.from(randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('')
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString()

/* ───────────── PNG sin dependencias (zlib + CRC32) ───────────── */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** PNG RGBA de 8 bits; `pixel(x, y)` devuelve [r, g, b, a]. */
function encodePng(width, height, pixel) {
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y)
      raw.set([r, g, b, a], y * stride + 1 + x * 4)
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bits por canal
  header[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const shade = (rgb, t) => mix(rgb, t > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(t))

/** Diseño de ejemplo en coordenadas 0..1: círculo con degradado, aro, barra "de texto" y puntos. */
function artPixel(u, v, palette) {
  const [c0, c1, c2] = palette.map(hex)
  const d = Math.hypot(u - 0.5, v - 0.42)
  if (d < 0.3) return [...mix(c0, c1, d / 0.3), 255]
  if (d > 0.325 && d < 0.365) return [...c2, 255]
  if (v > 0.8 && v < 0.93 && u > 0.12 && u < 0.88 && Math.floor(u * 26) % 4 !== 3) return [...c2, 255]
  if (Math.hypot(u - 0.14, v - 0.1) < 0.06 || Math.hypot(u - 0.86, v - 0.1) < 0.06) return [...c1, 255]
  return [0, 0, 0, 0]
}

const artPng = (w, h, palette) => encodePng(w, h, (x, y) => artPixel(x / w, y / h, palette))

/* Siluetas de producto en coordenadas 0..1 del lienzo (mismas proporciones que los mockups de la tienda). */
function inPoly(u, v, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inEllipse = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1

const SHAPES = {
  camiseta: (u, v) =>
    inPoly(u, v, [[0.3, 0.1], [0.1, 0.26], [0.17, 0.38], [0.28, 0.32], [0.28, 0.92], [0.72, 0.92], [0.72, 0.32], [0.83, 0.38], [0.9, 0.26], [0.7, 0.1]]) &&
    !inEllipse(u, v, 0.5, 0.085, 0.085, 0.06),
  hoodie: (u, v) =>
    inPoly(u, v, [[0.3, 0.1], [0.08, 0.3], [0.13, 0.62], [0.25, 0.6], [0.28, 0.35], [0.28, 0.93], [0.72, 0.93], [0.72, 0.35], [0.75, 0.6], [0.87, 0.62], [0.92, 0.3], [0.7, 0.1]]) ||
    (inEllipse(u, v, 0.5, 0.09, 0.15, 0.08) && !inEllipse(u, v, 0.5, 0.11, 0.08, 0.05)),
  gorra: (u, v) => (v < 0.58 && inEllipse(u, v, 0.5, 0.58, 0.3, 0.42)) || inEllipse(u, v, 0.5, 0.62, 0.42, 0.09),
  taza: (u, v) =>
    (u > 0.2 && u < 0.7 && v > 0.12 && v < 0.88) ||
    (inEllipse(u, v, 0.76, 0.5, 0.14, 0.27) && !inEllipse(u, v, 0.76, 0.5, 0.08, 0.17)),
}

/** Vista del producto con su color y el diseño colocado en la caja `box` (cm dentro de la zona). */
function previewPng(product, view, areaRegions, colorHex, palette) {
  const scale = 0.4
  const width = Math.round(view.w * scale)
  const height = Math.round(view.h * scale)
  const shape = SHAPES[product]
  const body = hex(product === 'taza' ? '#ffffff' : colorHex)
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) mask[y * width + x] = shape(x / width, y / height) ? 1 : 0
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : mask[y * width + x])
  return encodePng(width, height, (x, y) => {
    if (!at(x, y)) return [...hex('#f1ecff'), 255]
    if (!at(x - 2, y) || !at(x + 2, y) || !at(x, y - 2) || !at(x, y + 2)) return [27, 19, 64, 255]
    for (const r of areaRegions) {
      const px = x / scale
      const py = y / scale
      if (px >= r.x0 && px < r.x1 && py >= r.y0 && py < r.y1) {
        const [cr, cg, cb, ca] = artPixel((px - r.x0) / (r.x1 - r.x0), (py - r.y0) / (r.y1 - r.y0), palette)
        if (ca > 0) return [cr, cg, cb, 255]
      }
    }
    return [...shade(body, 0.05 - (y / height) * 0.12), 255]
  })
}

/* ───────────── Catálogo (copia reducida de src/config/products.ts) ───────────── */

const DISCOUNTS = [[1, 0], [5, 5], [10, 10], [25, 15], [50, 20]]
const T = {
  tee: [[100, 250], [250, 400], [500, 600], [800, 800], [1200, 1000]],
  teeChest: [[50, 200], [100, 250]],
  hood: [[100, 300], [250, 450], [500, 650], [800, 850], [1280, 1100]],
  hoodChest: [[50, 250], [100, 300]],
}

const CATALOG = {
  camiseta: {
    name: 'Camiseta',
    base: 890,
    sizeSurcharge: { XXL: 150 },
    views: { front: { w: 600, h: 700, px: 7.3 }, back: { w: 600, h: 700, px: 7.3 } },
    areas: {
      frente: { label: 'Frente', w: 30, h: 40, view: 'front', c: [300, 368], tiers: T.tee },
      pecho: { label: 'Pecho izquierdo', w: 10, h: 10, view: 'front', c: [370, 218], tiers: T.teeChest },
      espalda: { label: 'Espalda', w: 30, h: 40, view: 'back', c: [300, 348], tiers: T.tee },
    },
    colors: { blanco: ['Blanco', '#FFFFFF', 0], negro: ['Negro', '#1B1B22', 0], marino: ['Azul marino', '#1F2A5C', 0], rojo: ['Rojo', '#DD2A3C', 0] },
  },
  hoodie: {
    name: 'Sudadera con capucha',
    base: 2190,
    sizeSurcharge: { XXL: 200 },
    views: { front: { w: 640, h: 740, px: 6.6 }, back: { w: 640, h: 740, px: 6.6 } },
    areas: {
      frente: { label: 'Frente', w: 30, h: 34, view: 'front', c: [320, 388], tiers: T.hood },
      pecho: { label: 'Pecho izquierdo', w: 10, h: 10, view: 'front', c: [384, 304], tiers: T.hoodChest },
      espalda: { label: 'Espalda', w: 32, h: 40, view: 'back', c: [320, 410], tiers: T.hood },
    },
    colors: { rosa: ['Rosa chicle', '#FF8FC1', 0], negro: ['Negro', '#1B1B22', 0], gris: ['Gris jaspeado', '#B9BAC4', 0] },
  },
  gorra: {
    name: 'Gorra',
    base: 790,
    sizeSurcharge: {},
    views: { front: { w: 600, h: 520, px: 24 } },
    areas: { frontal: { label: 'Frontal', w: 12, h: 6.5, view: 'front', c: [300, 228], tiers: [[30, 250], [78, 350]] } },
    colors: { marino: ['Azul marino', '#1F2A5C', 0], negro: ['Negro', '#1B1B22', 0] },
  },
  taza: {
    name: 'Taza',
    base: 490,
    sizeSurcharge: {},
    views: { wrap: { w: 760, h: 400, px: 30 } },
    areas: { envolvente: { label: 'Envolvente', w: 20, h: 8.5, view: 'wrap', c: [380, 205], tiers: [[60, 250], [120, 350], [170, 450]] } },
    colors: { blanca: ['Toda blanca', '#FFFFFF', 0], rosa: ['Interior y asa rosa', '#FF4F9A', 150] },
  },
}

const PALETTES = [
  ['#ff4f9a', '#ffc93c', '#1b1340'],
  ['#12c8b4', '#7b5cff', '#1b1340'],
  ['#ff7a3d', '#ffc93c', '#c81e68'],
]

/* ───────────── Constructor de líneas de pedido ───────────── */

const image = (id, x, y, width, height, fileId) => ({
  id, type: 'image', x, y, width, height, rotation: 0, fileId, name: 'logo-cliente.png', naturalWidth: 400, naturalHeight: 400,
})
const text = (id, value, x, y, width, height, sizeCm, font, fill) => ({
  id, type: 'text', x, y, width, height, rotation: 0, text: value, font, sizeCm, fill, align: 'center',
})

const unionBox = (layers) => ({
  x0: Math.min(...layers.map((l) => l.x - l.width / 2)),
  y0: Math.min(...layers.map((l) => l.y - l.height / 2)),
  x1: Math.max(...layers.map((l) => l.x + l.width / 2)),
  y1: Math.max(...layers.map((l) => l.y + l.height / 2)),
})

/**
 * Crea una línea de pedido completa (precios, diseño, previews y archivos de impresión) y guarda sus PNG.
 * `placements`: { areaId: capas[] } con las capas en cm dentro de la zona.
 */
async function buildItem({ product, color, sizes, placements, palette, orderId, createdAt, note }) {
  const p = CATALOG[product]
  const [colorName, colorHex, colorSurcharge] = p.colors[color]
  const quantity = Object.values(sizes).reduce((n, q) => n + q, 0)

  const prints = []
  const printFiles = {}
  const regionsByView = {}
  for (const [areaId, layers] of Object.entries(placements)) {
    const area = p.areas[areaId]
    const box = unionBox(layers)
    const usedCm2 = Math.round((box.x1 - box.x0) * (box.y1 - box.y0) * 10) / 10
    const tier = area.tiers.find(([max]) => usedCm2 <= max + 0.01) ?? area.tiers.at(-1)
    prints.push({ areaId, label: area.label, usedCm2, cents: tier[1] })

    // Archivo de impresión: la caja del diseño a 10 px/cm con fondo transparente.
    const pw = Math.max(40, Math.round((box.x1 - box.x0) * 10))
    const ph = Math.max(40, Math.round((box.y1 - box.y0) * 10))
    const file = await storeFile({ kind: 'print', name: `${areaId}-impresion.png`, bytes: artPng(pw, ph, palette), orderId, createdAt })
    printFiles[areaId] = file

    const view = p.views[area.view]
    const topLeft = [area.c[0] - (area.w / 2) * view.px, area.c[1] - (area.h / 2) * view.px]
    ;(regionsByView[area.view] ??= []).push({
      x0: topLeft[0] + box.x0 * view.px,
      y0: topLeft[1] + box.y0 * view.px,
      x1: topLeft[0] + box.x1 * view.px,
      y1: topLeft[1] + box.y1 * view.px,
    })
  }

  const previews = {}
  for (const [viewId, regions] of Object.entries(regionsByView)) {
    const bytes = previewPng(product, p.views[viewId], regions, colorHex, palette)
    previews[viewId] = await storeFile({ kind: 'preview', name: `vista-${viewId}.png`, bytes, orderId, createdAt })
  }

  const unitBaseCents = p.base + colorSurcharge
  const printCents = prints.reduce((n, x) => n + x.cents, 0)
  const sizeSurchargeCents = Object.entries(sizes).reduce((n, [s, q]) => n + q * (p.sizeSurcharge[s] ?? 0), 0)
  const grossCents = quantity * (unitBaseCents + printCents) + sizeSurchargeCents
  const discountPct = DISCOUNTS.filter(([min]) => quantity >= min).at(-1)[1]
  const discountCents = Math.round((grossCents * discountPct) / 100)

  return {
    lineId: newId(10),
    productId: product,
    productName: p.name,
    colorId: color,
    colorName,
    colorHex,
    sizes,
    quantity,
    unitBaseCents,
    printCents,
    prints,
    sizeSurchargeCents,
    grossCents,
    discountPct,
    discountCents,
    totalCents: grossCents - discountCents,
    design: { v: 1, productId: product, colorId: color, areas: Object.fromEntries(Object.entries(placements).map(([a, layers]) => [a, { layers }])) },
    previews,
    printFiles,
    ...(note ? { note } : {}),
  }
}

async function storeFile({ kind, name, bytes, orderId = null, quoteId = null, createdAt }) {
  const id = newId(24)
  await db.execute({
    sql: `INSERT INTO files (id, kind, name, mime, size, data, order_id, quote_id, created_at) VALUES (?, ?, ?, 'image/png', ?, ?, ?, ?, ?)`,
    args: [id, kind, name, bytes.length, bytes, orderId, quoteId, createdAt],
  })
  return id
}

/* ───────────── Limpieza (--force) y comprobación de datos existentes ───────────── */

const existing = Number((await db.execute(`SELECT COUNT(*) AS n FROM orders WHERE email LIKE '%${DEMO_DOMAIN}'`)).rows[0].n)
if (existing > 0 && !FORCE) {
  console.log(`Ya hay ${existing} pedidos de demostración en ${DATABASE_URL}. Usa --force para recrearlos.`)
  process.exit(0)
}
if (existing > 0) {
  const orderIds = (await db.execute(`SELECT id FROM orders WHERE email LIKE '%${DEMO_DOMAIN}'`)).rows.map((r) => String(r.id))
  const quoteIds = (await db.execute(`SELECT id FROM quotes WHERE email LIKE '%${DEMO_DOMAIN}'`)).rows.map((r) => String(r.id))
  const marks = (ids) => ids.map(() => '?').join(',')
  const stmts = []
  if (orderIds.length) {
    stmts.push({ sql: `DELETE FROM files WHERE order_id IN (${marks(orderIds)})`, args: orderIds })
    stmts.push({ sql: `DELETE FROM order_events WHERE order_id IN (${marks(orderIds)})`, args: orderIds })
    stmts.push({ sql: `DELETE FROM orders WHERE id IN (${marks(orderIds)})`, args: orderIds })
  }
  if (quoteIds.length) {
    stmts.push({ sql: `DELETE FROM files WHERE quote_id IN (${marks(quoteIds)})`, args: quoteIds })
    stmts.push({ sql: `DELETE FROM quotes WHERE id IN (${marks(quoteIds)})`, args: quoteIds })
  }
  await db.batch(stmts, 'write')
  console.log(`Borrados ${orderIds.length} pedidos y ${quoteIds.length} presupuestos/mensajes de demostración anteriores.`)
}

/* ───────────── Pedidos ───────────── */

async function insertOrder(o) {
  const id = newId(20)
  const createdAt = hoursAgo(o.hoursAgo)
  const art = await storeFile({ kind: 'artwork', name: o.artName ?? 'logo-cliente.png', bytes: artPng(400, 400, o.palette), orderId: id, createdAt })
  const items = []
  for (const spec of o.items(art)) items.push(await buildItem({ ...spec, palette: o.palette, orderId: id, createdAt }))

  const subtotalCents = items.reduce((n, i) => n + i.totalCents, 0)
  const shippingCents = subtotalCents >= 6000 ? 0 : 495
  const totalCents = subtotalCents + shippingCents
  const vatCents = Math.round(totalCents - totalCents / 1.21)
  const paid = o.status !== 'pending_payment'
  const paidAt = paid ? hoursAgo(o.hoursAgo - 0.1) : null
  const paypal = o.provider === 'paypal'

  await db.execute({
    sql: `INSERT INTO orders (id, public_token, status, customer_name, email, phone, company, tax_id, shipping_json,
            items_json, subtotal_cents, shipping_cents, total_cents, vat_cents, payment_provider, payment_status,
            paypal_order_id, paypal_capture_id, paid_at, tracking_code, carrier, customer_note, admin_note,
            created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, newId(28), o.status, o.name, o.email, o.phone, o.company ?? null, o.taxId ?? null,
      JSON.stringify({ name: o.name, ...o.address, country: 'ES' }), JSON.stringify(items),
      subtotalCents, shippingCents, totalCents, vatCents, o.provider, paid ? 'captured' : 'created',
      paypal ? randomBytes(9).toString('hex').toUpperCase().slice(0, 17) : null,
      paypal && paid ? randomBytes(9).toString('hex').toUpperCase().slice(0, 17) : null,
      paidAt, o.tracking ?? null, o.carrier ?? null, o.customerNote ?? null, o.adminNote ?? null,
      createdAt, hoursAgo(o.hoursAgo - 1),
    ],
  })

  const events = [{ status: 'pending_payment', note: 'Pedido creado, pendiente de pago', actor: 'customer', at: createdAt }]
  if (paid) {
    events.push({ status: 'paid', note: paypal ? 'Pago confirmado con PayPal' : 'Pago simulado (modo demostración)', actor: paypal ? 'paypal' : 'system', at: paidAt })
  }
  o.history?.forEach(([status, note, hAgo]) => events.push({ status, note, actor: 'admin', at: hoursAgo(hAgo) }))
  await db.batch(
    events.map((e) => ({
      sql: `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [id, e.status, e.note, e.actor, e.at],
    })),
    'write',
  )
  return id
}

const address = (line1, postalCode, city, province, line2) => ({ line1, ...(line2 ? { line2 } : {}), postalCode, city, province })

const ORDERS = [
  {
    status: 'pending_payment', hoursAgo: 290, provider: 'paypal', palette: PALETTES[2],
    name: 'Iván Cabrera Soto', email: `ivan.cabrera${DEMO_DOMAIN}`, phone: '+34600112233',
    address: address('Calle Larga 8', '46001', 'Valencia', 'Valencia'),
    items: (art) => [{ product: 'gorra', color: 'marino', sizes: { unica: 2 }, placements: { frontal: [image('a', 6, 3.25, 6, 5, art)] } }],
  },
  {
    status: 'refunded', hoursAgo: 216, provider: 'paypal', palette: PALETTES[1],
    name: 'Elena Vidal Martín', email: `elena.vidal${DEMO_DOMAIN}`, phone: '+34611223344',
    address: address('Avenida de la Constitución 41', '41001', 'Sevilla', 'Sevilla', '2º A'),
    adminNote: 'Reembolsado desde PayPal: la foto no tenía resolución suficiente y la clienta prefirió no repetirla.',
    items: (art) => [{ product: 'taza', color: 'rosa', sizes: { unica: 1 }, placements: { envolvente: [image('a', 10, 4.25, 8, 8, art), text('t', 'Mejor abuela', 10, 4.25, 12, 3, 2.4, 'pacifico', '#1b1340')] } }],
    history: [['refunded', 'Reembolso emitido desde PayPal', 190]],
  },
  {
    status: 'shipped', hoursAgo: 120, provider: 'paypal', palette: PALETTES[0],
    name: 'Marta Ruiz Peña', email: `marta.ruiz${DEMO_DOMAIN}`, phone: '+34622334455',
    address: address('Calle de Alcalá 112', '28009', 'Madrid', 'Madrid', '4º C'),
    carrier: 'Correos Express', tracking: '2812345678901234',
    items: (art) => [
      { product: 'hoodie', color: 'negro', sizes: { M: 1 }, placements: { frente: [image('a', 15, 12, 18, 18, art), text('t', 'MARTA', 15, 26, 20, 5, 4, 'bangers', '#ffffff')] } },
      { product: 'camiseta', color: 'blanco', sizes: { S: 1 }, placements: { pecho: [image('a', 5, 5, 6, 6, art)] } },
    ],
    history: [['in_production', 'Empezamos a imprimir', 100], ['ready', 'Empaquetado', 78], ['shipped', 'Enviado con Correos Express', 70]],
  },
  {
    status: 'ready', hoursAgo: 52, provider: 'demo', palette: PALETTES[1],
    name: 'Rubén Gil Santos', email: `ruben.gil${DEMO_DOMAIN}`, phone: '+34633445566', company: 'Club Ciclista Los Pinos', taxId: 'G12345678',
    address: address('Camino de los Pinos s/n', '50012', 'Zaragoza', 'Zaragoza', 'Polideportivo, secretaría'),
    adminNote: 'Factura a nombre del club. Entregar a Rubén, no a la secretaría.',
    items: (art) => [
      {
        product: 'camiseta', color: 'marino', sizes: { S: 4, M: 9, L: 8, XL: 3, XXL: 1 },
        placements: {
          frente: [image('a', 15, 14, 20, 20, art), text('t', 'LOS PINOS', 15, 30, 24, 5, 4.2, 'anton', '#ffffff')],
          espalda: [text('b', 'CLUB CICLISTA', 15, 8, 26, 4, 3.4, 'bebas-neue', '#ffc93c')],
        },
      },
    ],
    history: [['in_production', null, 40], ['ready', 'Todo revisado y empaquetado', 6]],
  },
  {
    status: 'in_production', hoursAgo: 30, provider: 'paypal', palette: PALETTES[2],
    name: 'Sofía Navarro Gómez', email: `sofia.navarro${DEMO_DOMAIN}`, phone: '+34644556677',
    address: address('Rúa do Franco 23', '15705', 'Santiago de Compostela', 'A Coruña'),
    customerNote: 'Si podéis, que el dibujo quede un poco más a la izquierda en la sudadera. ¡Gracias!',
    items: (art) => [
      { product: 'hoodie', color: 'rosa', sizes: { S: 1, M: 1 }, note: 'La mitad de las sudaderas, en talla M, son para regalo.', placements: { frente: [image('a', 15, 14, 16, 16, art)] } },
      { product: 'taza', color: 'blanca', sizes: { unica: 3 }, placements: { envolvente: [image('a', 10, 4.25, 8, 8, art)] } },
    ],
    history: [['in_production', 'Diseño revisado, empezamos a imprimir', 20]],
  },
  {
    status: 'paid', hoursAgo: 2.5, provider: 'paypal', palette: PALETTES[0],
    name: 'Carlos Domínguez Ibáñez', email: `carlos.dominguez${DEMO_DOMAIN}`, phone: '+34655667788', company: 'Bar La Esquina', taxId: 'B87654321',
    address: address('Calle del Pozo 5', '37002', 'Salamanca', 'Salamanca'),
    customerNote: 'Necesitamos las camisetas antes del viernes para un evento. Si no llegáis, avisadme por favor.',
    items: (art) => [
      {
        product: 'camiseta', color: 'negro', sizes: { S: 2, M: 5, L: 4, XL: 1 },
        placements: {
          frente: [image('a', 15, 13, 20, 20, art), text('t', 'LA ESQUINA', 15, 29, 24, 5, 4.2, 'anton', '#ffc93c')],
          pecho: [image('b', 5, 5, 6, 6, art)],
        },
      },
    ],
  },
]

for (const order of ORDERS) await insertOrder(order)

/* ───────────── Presupuestos y mensaje ───────────── */

async function insertQuote(q) {
  const id = newId(20)
  const createdAt = hoursAgo(q.hoursAgo)
  const fileIds = []
  for (const name of q.files ?? []) fileIds.push(await storeFile({ kind: 'quote', name, bytes: artPng(480, 320, q.palette), quoteId: id, createdAt }))
  await db.execute({
    sql: `INSERT INTO quotes (id, kind, name, company, email, phone, products_json, quantity, deadline, message,
            file_ids_json, status, admin_note, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, q.kind, q.name, q.company ?? null, q.email, q.phone ?? null, JSON.stringify(q.products ?? []), q.quantity ?? null,
      q.deadline ?? null, q.message, JSON.stringify(fileIds), q.status, q.adminNote ?? null, createdAt, createdAt,
    ],
  })
}

await insertQuote({
  kind: 'quote', hoursAgo: 5, status: 'new', palette: PALETTES[1],
  name: 'Lorena Prieto Maldonado', company: 'Cervecería Artesana Norte', email: `lorena.prieto${DEMO_DOMAIN}`, phone: '+34666778899',
  products: ['camiseta', 'gorra'], quantity: 80, deadline: '2026-12-20', files: ['logo-cerveceria.png'],
  message: 'Hola, somos una cervecería artesana y queremos uniformar al equipo para las fiestas: unas 60 camisetas y 20 gorras con nuestro logo. ¿Podéis enviarnos un presupuesto con precios por volumen y plazos?',
})
await insertQuote({
  kind: 'quote', hoursAgo: 70, status: 'contacted', palette: PALETTES[2],
  name: 'Nuria Campos Vega', company: 'AMPA Colegio San Isidro', email: `nuria.campos${DEMO_DOMAIN}`, phone: '+34677889900',
  products: ['camiseta', 'hoodie'], quantity: 120, deadline: '2027-02-05', files: ['mascota-colegio.png'],
  adminNote: 'Hablado por teléfono el lunes. Esperan el presupuesto con tallas infantiles para el jueves.',
  message: 'Somos el AMPA de un colegio y queremos camisetas para la excursión de fin de curso y sudaderas para los alumnos de 6º. Aproximadamente 120 prendas entre las dos cosas.',
})
await insertQuote({
  kind: 'contact', hoursAgo: 20, status: 'new', palette: PALETTES[0],
  name: 'Lucía Fernández Roca', email: `lucia.fernandez${DEMO_DOMAIN}`, phone: '+34688990011',
  message: '¿Se pueden personalizar bolsas de tela? Me gustaría unas 15 para una boda y no las veo en la web.',
})

console.log(`Datos de demostración creados en ${DATABASE_URL}: ${ORDERS.length} pedidos, 2 presupuestos y 1 mensaje.`)
