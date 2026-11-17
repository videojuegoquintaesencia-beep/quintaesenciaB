/**
 * Creación segura del pedido. El navegador solo envía intenciones (producto, color, tallas, diseño,
 * ids de archivo y datos del cliente); aquí se vuelve a validar todo, se recalculan precios, envío e IVA
 * y se comprueba que cada archivo existe y es del tipo correcto antes de crear nada.
 */
import 'server-only'
import { z } from 'zod'
import { site } from '@/config/site'
import { getArea, getProduct, getView, type Product } from '@/config/products'
import { areaUsage, parseDesign, printedAreaIds, designArtworkFileIds, type Design } from './design'
import { getDb } from './db'
import { provinceFromPostalCode } from './es-provinces'
import { sendOrderAdminAlert, sendOrderConfirmation } from './emails/order'
import { getFileMetas, getPngSizes, type FileKind } from './files'
import { readBodyJson } from './http-body'
import { isValidId, newId } from './ids'
import { addOrderEvent, type NewOrderInput, type Order, type OrderItem, type PaymentProvider } from './orders'
import { computeCartTotals, priceLine, type LinePrice } from './pricing'
import { printFileMatchesBox } from './print-file'
import { addressSchema, customerSchema, fieldErrors } from './validators'

export const MAX_CART_LINES = 20

export const PAYMENT_UNAVAILABLE_MESSAGE = `El pago online no está disponible ahora mismo. Escríbenos a ${site.contact.email} y te ayudamos con tu pedido.`

const fileIdSchema = z.string().regex(/^[a-z0-9]{12,40}$/)

const cartLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().max(40),
  colorId: z.string().max(40),
  sizes: z.record(z.string().max(12), z.number().int().min(0).max(100000)),
  design: z.unknown(),
  previews: z.record(z.string().max(40), fileIdSchema),
  printFiles: z.record(z.string().max(40), fileIdSchema),
  note: z.string().trim().max(300).optional(),
})

const consentsSchema = z.object({
  terms: z.literal(true, { error: 'Debes aceptar las condiciones de venta' }),
  privacy: z.literal(true, { error: 'Debes confirmar que has leído la política de privacidad' }),
  noWithdrawal: z.literal(true, { error: 'Debes confirmar que has leído la información sobre el desistimiento' }),
  artworkRights: z.literal(true, { error: 'Debes confirmar que tienes derecho a usar los diseños' }),
})

const checkoutSchema = z.object({
  lines: z.array(z.unknown()).min(1, 'Tu carrito está vacío').max(MAX_CART_LINES, `Máximo ${MAX_CART_LINES} líneas por pedido`),
  customer: customerSchema,
  shipping: addressSchema,
  note: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
  consents: consentsSchema,
})

export type PrepareResult =
  | { ok: true; input: NewOrderInput }
  | {
      ok: false
      status: number
      error: string
      /** validation | zone | line_invalid | files_expired */
      code: string
      fieldErrors?: Record<string, string>
      /** Ids de las líneas del carrito afectadas. */
      lineIds?: string[]
    }

const fail = (
  status: number,
  code: string,
  error: string,
  extra: { fieldErrors?: Record<string, string>; lineIds?: string[] } = {},
): PrepareResult => ({ ok: false, status, code, error, ...extra })

const EVIDENCE_NOTE =
  'El cliente aceptó las condiciones de venta, confirmó que ha leído la política de privacidad, entendió que los productos personalizados no tienen derecho de desistimiento (art. 103.c TRLGDCU; conserva la garantía por defectos) y declaró tener derecho a usar los diseños subidos, que no incumplen los contenidos que no se imprimen.'

function lineLabel(productName: string, colorName: string) {
  return `${productName} · ${colorName}`
}

/** Archivos que debe tener cada línea y de qué tipo. */
function expectedFiles(
  product: Product,
  printedAreas: string[],
  line: z.infer<typeof cartLineSchema>,
  artworkIds: string[],
): { id: string; kinds: FileKind[] }[] | string {
  const previewIds = Object.entries(line.previews)
  if (previewIds.length === 0) return 'Falta la vista previa del diseño.'
  for (const [viewId] of previewIds) if (!getView(product, viewId)) return 'La vista previa no corresponde al producto.'
  for (const areaId of printedAreas) if (!line.printFiles[areaId]) return 'Falta el archivo de impresión de una zona.'
  for (const areaId of Object.keys(line.printFiles))
    if (!printedAreas.includes(areaId)) return 'Hay un archivo de impresión de una zona sin diseño.'
  return [
    ...previewIds.map(([, id]) => ({ id, kinds: ['preview'] as FileKind[] })),
    ...Object.values(line.printFiles).map((id) => ({ id, kinds: ['print'] as FileKind[] })),
    ...artworkIds.map((id) => ({ id, kinds: ['artwork', 'quote'] as FileKind[] })),
  ]
}

/** Caja (cm) que se cobra por cada zona estampada y archivo de impresión que debe corresponderle. */
interface PrintBox {
  fileId: string
  wCm: number
  hCm: number
}

function printBoxes(product: Product, design: Design, printedAreas: string[], printFiles: Record<string, string>): PrintBox[] {
  const boxes: PrintBox[] = []
  for (const areaId of printedAreas) {
    const area = getArea(product, areaId)
    const bbox = area ? areaUsage(design.areas[areaId]?.layers ?? [], area).bbox : null
    if (bbox && printFiles[areaId]) boxes.push({ fileId: printFiles[areaId], wCm: bbox.x1 - bbox.x0, hCm: bbox.y1 - bbox.y0 })
  }
  return boxes
}

/** Valida la petición de pago y construye el pedido con importes recalculados en el servidor. */
export async function prepareOrder(raw: unknown, provider: PaymentProvider): Promise<PrepareResult> {
  const parsed = checkoutSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error)
    const first = parsed.error.issues[0]
    return fail(422, first?.path[0] === 'lines' ? 'line_invalid' : 'validation', first?.message ?? 'Datos no válidos', {
      fieldErrors: errors,
    })
  }
  const { customer, note } = parsed.data
  // La provincia sale del código postal (que es lo que decide el envío), no del texto que escriba el cliente.
  const shipping = {
    ...parsed.data.shipping,
    province: provinceFromPostalCode(parsed.data.shipping.postalCode) ?? parsed.data.shipping.province,
  }

  const items: OrderItem[] = []
  const prices: LinePrice[] = []
  const expectedByLine: { lineId: string; label: string; files: { id: string; kinds: FileKind[] }[]; boxes: PrintBox[] }[] = []
  const seenLineIds = new Set<string>()

  for (const rawLine of parsed.data.lines) {
    const candidate = cartLineSchema.safeParse(rawLine)
    const maybeId = (rawLine as { id?: unknown } | null)?.id
    const hintId = typeof maybeId === 'string' ? maybeId : undefined
    if (!candidate.success)
      return fail(422, 'line_invalid', 'Hay una línea del carrito con datos no válidos.', { lineIds: hintId ? [hintId] : [] })
    const line = candidate.data
    const lineId = line.id && isValidId(line.id) && !seenLineIds.has(line.id) ? line.id : newId(12)
    seenLineIds.add(lineId)

    const product = getProduct(line.productId)
    if (!product) return fail(422, 'line_invalid', 'Un producto del carrito ya no está disponible.', { lineIds: [lineId] })

    const color = product.colors.find((c) => c.id === line.colorId)
    const colorName = color?.name ?? line.colorId
    const label = lineLabel(product.name, colorName)
    const checked = parseDesign(line.design)
    if (!checked.ok) return fail(422, 'line_invalid', `${label}: ${checked.error}`, { lineIds: [lineId] })
    const design = checked.design

    const sizes = Object.fromEntries(Object.entries(line.sizes).filter(([, q]) => q > 0))
    const price = priceLine({ productId: product.id, colorId: line.colorId, sizes, design })
    if (!price.ok) return fail(422, 'line_invalid', `${label}: ${price.error}`, { lineIds: [lineId] })

    const printed = printedAreaIds(design)
    const artworkIds = designArtworkFileIds(design)
    const files = expectedFiles(product, printed, line, artworkIds)
    if (typeof files === 'string') return fail(422, 'line_invalid', `${label}: ${files}`, { lineIds: [lineId] })
    expectedByLine.push({ lineId, label, files, boxes: printBoxes(product, design, printed, line.printFiles) })

    prices.push(price)
    items.push({
      lineId,
      productId: product.id,
      productName: product.name,
      colorId: line.colorId,
      colorName,
      colorHex: color?.hex ?? '#ffffff',
      sizes,
      quantity: price.quantity,
      unitBaseCents: price.unitBaseCents,
      printCents: price.printCents,
      prints: price.prints,
      sizeSurchargeCents: price.sizeSurchargeCents,
      grossCents: price.grossCents,
      discountPct: price.discountPct,
      discountCents: price.discountCents,
      totalCents: price.totalCents,
      design,
      previews: line.previews,
      printFiles: line.printFiles,
      note: line.note || undefined,
    })
  }

  // Archivos: deben existir (los carritos antiguos pueden haberlos perdido) y ser del tipo esperado.
  const metas = await getFileMetas([...new Set(expectedByLine.flatMap((l) => l.files.map((f) => f.id)))])
  const kindById = new Map(metas.map((m) => [m.id, m.kind]))
  const expired = expectedByLine.filter((l) => l.files.some((f) => !kindById.has(f.id)))
  if (expired.length > 0) {
    const names = expired.map((l) => l.label).join(', ')
    return fail(
      409,
      'files_expired',
      expired.length === 1
        ? `Los archivos de “${names}” han caducado. Vuelve a abrir el diseño en el editor para rehacerlo.`
        : `Los archivos de estas líneas han caducado: ${names}. Vuelve a abrir cada diseño en el editor para rehacerlo.`,
      { lineIds: expired.map((l) => l.lineId) },
    )
  }
  const wrongKind = expectedByLine.filter((l) => l.files.some((f) => !f.kinds.includes(kindById.get(f.id) as FileKind)))
  if (wrongKind.length > 0)
    return fail(422, 'line_invalid', 'Hay archivos del carrito que no son válidos.', { lineIds: wrongKind.map((l) => l.lineId) })

  // El archivo de impresión debe medir lo que se cobra: el precio sale de la superficie declarada en el diseño,
  // así que un PNG de otro tamaño permitiría pagar un estampado pequeño e imprimir uno grande.
  const sizes = await getPngSizes([...new Set(expectedByLine.flatMap((l) => l.boxes.map((b) => b.fileId)))])
  const mismatched = expectedByLine.filter((l) =>
    l.boxes.some((b) => {
      const size = sizes.get(b.fileId)
      return !size || !printFileMatchesBox(size, b.wCm, b.hCm)
    }),
  )
  if (mismatched.length > 0) {
    return fail(
      422,
      'line_invalid',
      `${mismatched[0].label}: el archivo de impresión no se corresponde con el diseño. Abre el diseño en el editor y vuelve a añadirlo al carrito.`,
      { lineIds: mismatched.map((l) => l.lineId) },
    )
  }

  const totals = computeCartTotals(
    prices.map((p) => p.totalCents),
    shipping.postalCode,
  )
  if (totals.shippingCents === null)
    return fail(422, 'zone', 'No enviamos a ese código postal desde la tienda online.', {
      fieldErrors: { 'shipping.postalCode': 'No enviamos a ese código postal desde la tienda online.' },
    })

  return {
    ok: true,
    input: {
      customer,
      shipping,
      items,
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      totalCents: totals.totalCents,
      vatCents: totals.vatCents,
      paymentProvider: provider,
      customerNote: note || undefined,
    },
  }
}

/** Deja constancia de los consentimientos aceptados en el historial del pedido. */
export function recordConsents(orderId: string) {
  return addOrderEvent(orderId, EVIDENCE_NOTE, 'customer')
}

/** Emails tras un pago confirmado. Nunca lanza: un fallo de email no puede afectar al pago. */
export async function notifyOrderPaid(order: Order): Promise<void> {
  const results = await Promise.allSettled([sendOrderConfirmation(order), sendOrderAdminAlert(order)])
  for (const r of results) {
    if (r.status === 'rejected') console.error('[pedido] Error al enviar un email:', r.reason)
    else if (!r.value.ok) console.error('[pedido] Email no enviado:', r.value.error)
  }
}

/** Ruta de la página de pedido para el cliente (incluye el token secreto). */
export function orderPagePath(order: Pick<Order, 'id' | 'publicToken'>): string {
  return `/pedido/${order.id}?t=${order.publicToken}`
}

/** Busca un pedido por su captura de PayPal (para webhooks de reembolso sin custom_id). */
export async function findOrderIdByCaptureId(captureId: string): Promise<string | null> {
  const db = await getDb()
  const res = await db.execute({ sql: `SELECT id FROM orders WHERE paypal_capture_id = ? LIMIT 1`, args: [captureId] })
  return res.rows[0] ? String(res.rows[0].id) : null
}

/**
 * Lee el cuerpo JSON de una petición con un tope REAL de tamaño (también sin `Content-Length`);
 * devuelve undefined si no es JSON válido o es demasiado grande.
 */
export async function readJsonBody(req: Request, maxBytes = 512 * 1024): Promise<unknown> {
  const res = await readBodyJson(req, maxBytes)
  return res.ok ? res.value : undefined
}
