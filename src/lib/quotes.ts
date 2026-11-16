/**
 * Solicitudes de presupuesto (empresas/equipos/eventos) y mensajes de contacto.
 * Ambos se guardan en la misma tabla, diferenciados por `kind`.
 */
import 'server-only'
import { getDb, nowIso } from './db'
import { attachFiles } from './files'
import { newId } from './ids'
import { QUOTE_STATUSES, type QuoteStatus } from './order-status'
import type { ContactMessageInput, QuoteRequestInput } from './validators'

export type QuoteKind = 'quote' | 'contact'

export interface Quote {
  id: string
  /** "PR-1001" para presupuestos y "MS-1001" para mensajes de contacto. */
  number: string
  seq: number
  kind: QuoteKind
  name: string
  company: string | null
  email: string
  phone: string | null
  products: string[]
  quantity: number | null
  deadline: string | null
  message: string
  fileIds: string[]
  status: QuoteStatus
  adminNote: string | null
  createdAt: string
  updatedAt: string
}

const formatQuoteNumber = (kind: QuoteKind, seq: number) => `${kind === 'quote' ? 'PR' : 'MS'}-${1000 + seq}`

type Row = Record<string, unknown>

function isQuoteStatus(v: unknown): v is QuoteStatus {
  return typeof v === 'string' && (QUOTE_STATUSES as readonly string[]).includes(v)
}

function mapQuote(r: Row): Quote {
  const kind = (String(r.kind) === 'contact' ? 'contact' : 'quote') as QuoteKind
  const seq = Number(r.seq)
  return {
    id: String(r.id),
    seq,
    number: formatQuoteNumber(kind, seq),
    kind,
    name: String(r.name),
    company: r.company == null ? null : String(r.company),
    email: String(r.email),
    phone: r.phone == null ? null : String(r.phone),
    products: JSON.parse(String(r.products_json)),
    quantity: r.quantity == null ? null : Number(r.quantity),
    deadline: r.deadline == null ? null : String(r.deadline),
    message: String(r.message),
    fileIds: JSON.parse(String(r.file_ids_json)),
    status: isQuoteStatus(r.status) ? r.status : 'new',
    adminNote: r.admin_note == null ? null : String(r.admin_note),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }
}

export async function createQuote(input: QuoteRequestInput): Promise<Quote> {
  return insert('quote', {
    name: input.name,
    company: input.company || null,
    email: input.email,
    phone: input.phone || null,
    products: input.products,
    quantity: input.quantity,
    deadline: input.deadline || null,
    message: input.message,
    fileIds: input.fileIds,
  })
}

export async function createContactMessage(input: ContactMessageInput): Promise<Quote> {
  return insert('contact', {
    name: input.name,
    company: null,
    email: input.email,
    phone: input.phone || null,
    products: [],
    quantity: null,
    deadline: null,
    message: input.message,
    fileIds: [],
  })
}

async function insert(
  kind: QuoteKind,
  v: {
    name: string
    company: string | null
    email: string
    phone: string | null
    products: string[]
    quantity: number | null
    deadline: string | null
    message: string
    fileIds: string[]
  },
): Promise<Quote> {
  const db = await getDb()
  const id = newId(20)
  const now = nowIso()
  await db.execute({
    sql: `INSERT INTO quotes (id, kind, name, company, email, phone, products_json, quantity, deadline, message,
            file_ids_json, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
    args: [
      id, kind, v.name, v.company, v.email, v.phone, JSON.stringify(v.products), v.quantity, v.deadline,
      v.message, JSON.stringify(v.fileIds), now, now,
    ],
  })
  await attachFiles({ quoteId: id }, v.fileIds)
  const quote = await getQuote(id)
  if (!quote) throw new Error('No se pudo guardar la solicitud')
  return quote
}

export async function getQuote(id: string): Promise<Quote | null> {
  const db = await getDb()
  const res = await db.execute({ sql: `SELECT * FROM quotes WHERE id = ?`, args: [id] })
  const row = res.rows[0] as unknown as Row | undefined
  return row ? mapQuote(row) : null
}

export async function listQuotes(opts: {
  kind?: QuoteKind | 'all'
  status?: QuoteStatus | 'all' | 'active'
  q?: string
  limit?: number
  offset?: number
} = {}): Promise<{ rows: Quote[]; total: number }> {
  const db = await getDb()
  const where: string[] = []
  const args: (string | number)[] = []
  if (opts.kind && opts.kind !== 'all') {
    where.push(`kind = ?`)
    args.push(opts.kind)
  }
  if (opts.status === 'active') where.push(`status IN ('new','contacted','quoted')`)
  else if (opts.status && opts.status !== 'all') {
    where.push(`status = ?`)
    args.push(opts.status)
  }
  const q = opts.q?.trim()
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    where.push(`(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR COALESCE(company,'') LIKE ? ESCAPE '\\')`)
    args.push(like, like, like)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 200)
  const offset = Math.max(opts.offset ?? 0, 0)
  const [c, r] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS n FROM quotes ${whereSql}`, args }),
    db.execute({ sql: `SELECT * FROM quotes ${whereSql} ORDER BY seq DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] }),
  ])
  return { rows: r.rows.map((x) => mapQuote(x as unknown as Row)), total: Number(c.rows[0]?.n ?? 0) }
}

export async function updateQuote(id: string, patch: { status?: QuoteStatus; adminNote?: string }): Promise<Quote | null> {
  const db = await getDb()
  const sets: string[] = []
  const args: (string | null)[] = []
  if (patch.status && QUOTE_STATUSES.includes(patch.status)) {
    sets.push('status = ?')
    args.push(patch.status)
  }
  if (patch.adminNote !== undefined) {
    sets.push('admin_note = ?')
    args.push(patch.adminNote.trim() || null)
  }
  if (sets.length) {
    sets.push('updated_at = ?')
    args.push(nowIso())
    await db.execute({ sql: `UPDATE quotes SET ${sets.join(', ')} WHERE id = ?`, args: [...args, id] })
  }
  return getQuote(id)
}

export async function countNewQuotes(): Promise<number> {
  const db = await getDb()
  const res = await db.execute(`SELECT COUNT(*) AS n FROM quotes WHERE status = 'new'`)
  return Number(res.rows[0]?.n ?? 0)
}
