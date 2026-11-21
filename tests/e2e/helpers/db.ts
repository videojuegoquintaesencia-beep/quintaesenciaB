/**
 * Acceso directo a la base de datos del servidor de pruebas (`data/e2e.db`, ver `webServer.env`). Solo se usa para
 * limpiar al empezar y para leer lo que la API no devuelve (número de pedido, filas guardadas).
 */
import path from 'node:path'
import { createClient, type Client } from '@libsql/client'

export const E2E_DB_PATH = path.resolve(__dirname, '../../../data/e2e.db')

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = createClient({ url: `file:${E2E_DB_PATH}` })
  try {
    // El servidor puede estar escribiendo a la vez: esperar en lugar de fallar con SQLITE_BUSY.
    await db.execute('PRAGMA busy_timeout = 5000').catch(() => undefined)
    return await fn(db)
  } finally {
    db.close()
  }
}

/** Vacía las tablas de datos (no toca el esquema). */
export async function resetDatabase(): Promise<void> {
  await withDb((db) =>
    db.batch(
      ['DELETE FROM order_events', 'DELETE FROM orders', 'DELETE FROM quotes', 'DELETE FROM files', 'DELETE FROM login_attempts', 'DELETE FROM settings'],
      'write',
    ),
  )
}

/** Número visible ("PU-1042") de un pedido por su id. */
export async function orderNumberOf(orderId: string): Promise<string> {
  const seq = await withDb(async (db) => (await db.execute({ sql: 'SELECT seq FROM orders WHERE id = ?', args: [orderId] })).rows[0]?.seq)
  if (seq === undefined) throw new Error(`No existe el pedido ${orderId} en ${E2E_DB_PATH}`)
  return `PU-${1000 + Number(seq)}`
}

export async function orderStatusOf(orderId: string): Promise<string | null> {
  return withDb(async (db) => {
    const row = (await db.execute({ sql: 'SELECT status FROM orders WHERE id = ?', args: [orderId] })).rows[0]
    return row ? String(row.status) : null
  })
}

/** Presupuestos y mensajes guardados para un email (vacío si el envío se descartó). */
export async function quotesByEmail(email: string): Promise<{ kind: string; status: string; message: string; products: string[] }[]> {
  return withDb(async (db) => {
    const res = await db.execute({ sql: 'SELECT kind, status, message, products_json FROM quotes WHERE email = ? ORDER BY seq', args: [email] })
    return res.rows.map((r) => ({ kind: String(r.kind), status: String(r.status), message: String(r.message), products: JSON.parse(String(r.products_json)) as string[] }))
  })
}
