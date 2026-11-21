import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CopyButton } from '@/components/admin/CopyButton'
import { PageHeader } from '@/components/admin/PageHeader'
import { PrintButton } from '@/components/admin/PrintButton'
import { InvoiceSheet, invoiceTitle } from '@/components/invoice/InvoiceSheet'
import { invoiceUrl } from '@/lib/emails/order'
import { isValidId } from '@/lib/ids'
import { getInvoiceRecord } from '@/lib/invoices'
import { loadOrder } from '@/lib/admin/queries'
import { adminDateTime } from '@/lib/admin/dates'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ doc?: string | string[] }> }

/** La misma factura puede verse como original o, si existe, como rectificativa (?doc=rectificativa). */
async function loadDocument(id: string, docParam: string | string[] | undefined) {
  if (!isValidId(id)) return null
  const order = await loadOrder(id)
  if (!order) return null
  const record = await getInvoiceRecord(order.id)
  if (!record) return null
  const wantsRectification = docParam === 'rectificativa'
  if (wantsRectification && !record.rectification) return null
  return { order, record, doc: wantsRectification ? record.rectification! : record.invoice }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ id }, { doc }] = await Promise.all([params, searchParams])
  const loaded = await loadDocument(id, doc)
  return { title: loaded ? `${invoiceTitle(loaded.doc)} ${loaded.doc.number}` : 'Factura' }
}

/** Al imprimir solo queda la factura, en A4 (el marco del panel se oculta con print:hidden). */
const PRINT_CSS = `
@page { size: A4 portrait; margin: 12mm; }
@media print {
  html, body { background: #fff !important; }
}
`

export default async function InvoicePage({ params, searchParams }: Props) {
  const [{ id }, { doc: docParam }] = await Promise.all([params, searchParams])
  const loaded = await loadDocument(id, docParam)
  if (!loaded) notFound()
  const { order, record, doc } = loaded
  const rect = doc.kind === 'rectification'

  return (
    <>
      <style>{PRINT_CSS}</style>
      <PageHeader
        back={{ href: `/admin/pedidos/${order.id}`, label: `Volver al pedido ${order.number}` }}
        title={`${invoiceTitle(doc)} ${doc.number}`}
        description={
          <>
            Emitida el {adminDateTime(doc.issuedAt)}. Imprímela o guárdala en PDF desde el diálogo de impresión del navegador.
            {record.rectification && !rect && (
              <>
                {' '}
                Esta factura está <strong>anulada</strong> por la rectificativa{' '}
                <Link href={`/admin/pedidos/${order.id}/factura?doc=rectificativa`} className="font-bold text-violet-deep underline">
                  {record.rectification.number}
                </Link>
                .
              </>
            )}
            {rect && (
              <>
                {' '}
                Anula la{' '}
                <Link href={`/admin/pedidos/${order.id}/factura`} className="font-bold text-violet-deep underline">
                  factura {record.invoice.number}
                </Link>
                .
              </>
            )}
          </>
        }
        actions={
          <>
            <CopyButton text={invoiceUrl(order, doc.kind)} label="Copiar enlace del cliente" className="btn-lg" />
            <PrintButton className="btn btn-primary btn-lg" label="Imprimir o guardar en PDF" />
          </>
        }
      />
      <InvoiceSheet doc={doc} />
    </>
  )
}
