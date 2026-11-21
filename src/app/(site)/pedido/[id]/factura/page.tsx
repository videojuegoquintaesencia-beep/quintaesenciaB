import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { PrintButton } from '@/components/admin/PrintButton'
import { InvoiceSheet, invoiceTitle } from '@/components/invoice/InvoiceSheet'
import { isValidId } from '@/lib/ids'
import type { InvoiceDocument, InvoiceRecord } from '@/lib/invoice-document'
import { getInvoiceRecord } from '@/lib/invoices'
import { getOrderByToken, type Order } from '@/lib/orders'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string | string[]; doc?: string | string[] }>
}

interface Loaded {
  order: Order
  record: InvoiceRecord
  doc: InvoiceDocument
}

/**
 * Mismo control que la página del pedido (id + token secreto, comparación en tiempo constante) y, además, 404 si el
 * pedido no tiene factura o se pide una rectificativa que no existe. Una sola consulta por petición (React `cache`).
 */
const load = cache(async (id: string, token: string | string[] | undefined, docParam: string | string[] | undefined): Promise<Loaded | null> => {
  if (!isValidId(id) || typeof token !== 'string' || token.length < 10) return null
  const order = await getOrderByToken(id, token)
  if (!order) return null
  const record = await getInvoiceRecord(order.id)
  if (!record) return null
  const wantsRectification = docParam === 'rectificativa'
  if (wantsRectification && !record.rectification) return null
  return { order, record, doc: wantsRectification ? record.rectification! : record.invoice }
})

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ id }, { t, doc }] = await Promise.all([params, searchParams])
  const loaded = await load(id, t, doc)
  return {
    title: loaded ? `${invoiceTitle(loaded.doc)} ${loaded.doc.number}` : 'Página no encontrada',
    robots: { index: false, follow: false },
    // El enlace lleva el token secreto del pedido: que no viaje en la cabecera Referer a otras webs.
    referrer: 'no-referrer',
  }
}

/** En papel solo queda la factura: se ocultan cabecera, pie y botones de la tienda. */
const PRINT_CSS = `@page { size: A4 portrait; margin: 12mm; }
@media print {
  body:has([data-invoice-page]) :is(header, footer, nav):not([data-invoice-page] *) { display: none !important; }
  body:has([data-invoice-page]) .skip-link { display: none !important; }
  body:has([data-invoice-page]), body:has([data-invoice-page]) main { background: #fff !important; }
  [data-invoice-page] { padding: 0 !important; }
}`

export default async function CustomerInvoicePage({ params, searchParams }: PageProps) {
  const [{ id }, { t, doc: docParam }] = await Promise.all([params, searchParams])
  const loaded = await load(id, t, docParam)
  if (!loaded) notFound()
  const { order, record, doc } = loaded
  const rect = doc.kind === 'rectification'
  const orderUrl = `/pedido/${order.id}?t=${order.publicToken}`
  const otherUrl = `/pedido/${order.id}/factura?t=${order.publicToken}${rect ? '' : '&doc=rectificativa'}`

  return (
    <div data-invoice-page className="container-pop py-8 sm:py-12">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <Link href={orderUrl} className="inline-flex min-h-11 items-center gap-1.5 font-bold text-violet-deep hover:underline">
            <ArrowLeft size={18} aria-hidden="true" />
            Volver a mi pedido {order.number}
          </Link>
          <h1 className="text-3xl sm:text-4xl">
            {invoiceTitle(doc)} {doc.number}
          </h1>
          {record.rectification && (
            <p className="mt-1 text-ink-soft">
              {rect ? (
                <>
                  Anula la{' '}
                  <Link href={otherUrl} className="font-bold text-violet-deep underline">
                    factura {record.invoice.number}
                  </Link>
                  .
                </>
              ) : (
                <>
                  Esta factura está anulada por la{' '}
                  <Link href={otherUrl} className="font-bold text-violet-deep underline">
                    factura rectificativa {record.rectification.number}
                  </Link>
                  .
                </>
              )}
            </p>
          )}
        </div>
        <PrintButton className="btn btn-primary" label="Imprimir o guardar en PDF" />
      </div>
      <InvoiceSheet doc={doc} />
    </div>
  )
}
