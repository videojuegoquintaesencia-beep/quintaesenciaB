/**
 * Acceso a la base de datos (libSQL: archivo SQLite en local, Turso en producción).
 * `await getDb()` devuelve el cliente con el esquema ya creado.
 */
import 'server-only'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client } from '@libsql/client'

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    name TEXT,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    order_id TEXT,
    quote_id TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_files_order ON files(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_files_quote ON files(quote_id)`,
  `CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at)`,

  `CREATE TABLE IF NOT EXISTS orders (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    public_token TEXT NOT NULL,
    status TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    tax_id TEXT,
    shipping_json TEXT NOT NULL,
    items_json TEXT NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    vat_cents INTEGER NOT NULL,
    payment_provider TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    paypal_order_id TEXT,
    paypal_capture_id TEXT,
    paid_at TEXT,
    tracking_code TEXT,
    carrier TEXT,
    customer_note TEXT,
    admin_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paypal ON orders(paypal_order_id) WHERE paypal_order_id IS NOT NULL`,

  `CREATE TABLE IF NOT EXISTS order_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    status TEXT,
    note TEXT,
    actor TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id)`,

  `CREATE TABLE IF NOT EXISTS quotes (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    products_json TEXT NOT NULL,
    quantity INTEGER,
    deadline TEXT,
    message TEXT NOT NULL,
    file_ids_json TEXT NOT NULL,
    status TEXT NOT NULL,
    admin_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)`,
  `CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at)`,

  // Intentos de acceso al panel (límite por IP y global, compartido entre instancias).
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_at ON login_attempts(created_at)`,

  // Pequeños valores de estado del panel (p. ej. "las sesiones anteriores a esta fecha están revocadas").
  `CREATE TABLE IF NOT EXISTS admin_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  // Ajustes del negocio editables desde el panel: una fila por sección, en JSON (ver lib/settings.ts).
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // Contadores con nombre (p. ej. numeración de facturas por serie). Se incrementan en una transacción.
  `CREATE TABLE IF NOT EXISTS counters (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  )`,
]

/**
 * Columnas añadidas después de la primera versión. SQLite no tiene "ADD COLUMN IF NOT EXISTS", así que se
 * comprueban con PRAGMA table_info y se añaden solo las que falten (también en bases creadas por el seed).
 */
const COLUMNS: { table: string; column: string; ddl: string }[] = [
  // Facturas: número (serie + correlativo), fecha de emisión y copia inmutable de los datos facturados.
  { table: 'orders', column: 'invoice_number', ddl: 'TEXT' },
  { table: 'orders', column: 'invoice_issued_at', ddl: 'TEXT' },
  { table: 'orders', column: 'invoice_json', ddl: 'TEXT' },
  // Pedido creado a partir de un presupuesto aceptado.
  { table: 'orders', column: 'quote_id', ddl: 'TEXT' },
  // Presupuestos: enlace público con token, propuesta con precio enviada al cliente y pedido resultante.
  { table: 'quotes', column: 'public_token', ddl: 'TEXT' },
  { table: 'quotes', column: 'proposal_json', ddl: 'TEXT' },
  { table: 'quotes', column: 'proposal_sent_at', ddl: 'TEXT' },
  { table: 'quotes', column: 'order_id', ddl: 'TEXT' },
]

/** Índices sobre columnas añadidas (se crean después de las columnas). */
const POST_SCHEMA = [
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice ON orders(invoice_number) WHERE invoice_number IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_orders_quote ON orders(quote_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quotes_order ON quotes(order_id)`,
]

async function ensureColumns(client: Client): Promise<void> {
  const tables = [...new Set(COLUMNS.map((c) => c.table))]
  for (const table of tables) {
    const info = await client.execute(`PRAGMA table_info(${table})`)
    const existing = new Set(info.rows.map((r) => String(r.name)))
    for (const col of COLUMNS) {
      if (col.table !== table || existing.has(col.column)) continue
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col.column} ${col.ddl}`)
    }
  }
}

type Globals = typeof globalThis & { __puDb?: Client; __puDbReady?: Promise<void> }
const g = globalThis as Globals

function createDbClient(): Client {
  const url = process.env.DATABASE_URL || 'file:./data/pieza-unica.db'
  if (url.startsWith('file:') && !url.includes(':memory:')) {
    const path = url.slice('file:'.length).replace(/^\/\//, '')
    try {
      mkdirSync(dirname(path), { recursive: true })
    } catch {
      /* ignorar: libsql informará si no puede abrir el archivo */
    }
  }
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined })
}

export async function getDb(): Promise<Client> {
  if (!g.__puDb) g.__puDb = createDbClient()
  const client = g.__puDb
  if (!g.__puDbReady) {
    g.__puDbReady = (async () => {
      await client.batch(SCHEMA.map((sql) => ({ sql, args: [] })), 'write')
      await ensureColumns(client)
      await client.batch(POST_SCHEMA.map((sql) => ({ sql, args: [] })), 'write')
    })().catch((err) => {
      g.__puDbReady = undefined
      throw err
    })
  }
  await g.__puDbReady
  return client
}

export const nowIso = () => new Date().toISOString()
