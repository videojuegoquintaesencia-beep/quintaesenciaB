'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import Link from 'next/link'
import { FileText, Mail, Printer } from 'lucide-react'
import { INVOICEABLE_STATUSES, RECTIFIABLE_STATUSES } from '@/lib/invoice-document'
import type { OrderStatus } from '@/lib/order-status'
import { postJson } from '@/lib/admin/client'
import { adminDateTime } from '@/lib/admin/dates'
import { CopyButton } from './CopyButton'
import { Feedback } from './Feedback'
import { Panel } from './Panel'

interface InvoiceSummary {
  number: string
  issuedAt: string
}

interface IssueResponse {
  created: boolean
  number: string
}

interface SendResponse {
  number: string
  email: 'sent' | 'simulated' | 'failed'
  emailTo: string
  emailError?: string
}

type Pending = 'issue' | 'send' | 'rectify' | null

interface Notice {
  kind: 'success' | 'warning' | 'error'
  text: string
}

/**
 * Factura del pedido en el panel: emitirla (con confirmación: consume un número de la serie y no se deshace),
 * verla e imprimirla, copiar el enlace del cliente, enviarla por email y, en pedidos reembolsados o cancelados,
 * emitir la rectificativa que la anula.
 */
export function InvoicePanel({
  orderId,
  status,
  customerEmail,
  customerUrl,
  invoice,
  rectification,
  demo,
}: {
  orderId: string
  status: OrderStatus
  customerEmail: string
  /** Enlace público de la factura (con el token del pedido), si ya está emitida. */
  customerUrl: string | null
  invoice: InvoiceSummary | null
  rectification: InvoiceSummary | null
  demo: boolean
}) {
  const router = useRouter()
  const uid = useId()
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const canIssue = !invoice && INVOICEABLE_STATUSES.includes(status)
  const canRectify = !!invoice && !rectification && RECTIFIABLE_STATUSES.includes(status)
  const adminHref = `/admin/pedidos/${orderId}/factura`

  function ask(action: Exclude<Pending, null>) {
    setPending(pending === action ? null : action)
    setNotice(null)
  }

  async function confirm() {
    if (!pending || busy) return
    setBusy(true)
    setNotice(null)
    const action = pending
    if (action === 'send') {
      const result = await postJson<SendResponse>(`/api/admin/orders/${orderId}/invoice`, { action })
      setBusy(false)
      if (!result.ok) {
        setNotice({ kind: 'error', text: result.error })
        return
      }
      const { email, emailTo, emailError, number } = result.data
      if (email === 'sent') setNotice({ kind: 'success', text: `Factura ${number} enviada a ${emailTo}.` })
      else if (email === 'simulated')
        setNotice({ kind: 'warning', text: `El email NO se ha enviado porque el servidor de correo (SMTP) no está configurado; solo queda en el registro del servidor.` })
      else setNotice({ kind: 'warning', text: `No se pudo enviar el email a ${emailTo}${emailError ? ` (${emailError})` : ''}. Copia el enlace y mándaselo tú.` })
    } else {
      const result = await postJson<IssueResponse>(`/api/admin/orders/${orderId}/invoice`, { action })
      setBusy(false)
      if (!result.ok) {
        setNotice({ kind: 'error', text: result.error })
        if (result.status === 409) router.refresh()
        return
      }
      const what = action === 'rectify' ? 'Factura rectificativa' : 'Factura'
      setNotice({
        kind: 'success',
        text: result.data.created ? `${what} ${result.data.number} emitida.` : `${what} ya emitida con el número ${result.data.number}.`,
      })
    }
    setPending(null)
    router.refresh()
  }

  const confirmText: Record<Exclude<Pending, null>, { title: string; body: string; button: string }> = {
    issue: {
      title: 'Emitir la factura de este pedido',
      body: 'Se le asignará el siguiente número de la serie del año y se guardará una copia de los datos facturados. Una factura emitida no se puede borrar ni modificar: si hubiera un error, habría que rectificarla.',
      button: 'Confirmar emisión',
    },
    send: {
      title: 'Enviar la factura por email',
      body: `El cliente recibirá en ${customerEmail} un enlace personal para ver, imprimir o guardar en PDF ${rectification ? 'la factura rectificativa (y la factura anulada)' : 'su factura'}.`,
      button: 'Enviar email',
    },
    rectify: {
      title: 'Emitir la factura rectificativa',
      body: `Anula íntegramente la factura ${invoice?.number ?? ''} con los mismos importes en negativo y un número de la serie R. Hazlo solo cuando el dinero ya esté devuelto al cliente.`,
      button: 'Confirmar rectificativa',
    },
  }

  return (
    <Panel title="Factura" id="factura" icon={<FileText size={20} />}>
      {demo && (canIssue || invoice) && (
        <p className="mb-3 text-sm text-ink-soft">
          Pedido de demostración: la factura {invoice ? 'está' : 'saldrá'} marcada como <strong>«Demostración · sin validez»</strong>.
        </p>
      )}

      {invoice ? (
        <dl className="divide-y-2 divide-ink/10 text-[0.95rem]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5">
            <dt className="text-ink-soft">Factura</dt>
            <dd className="font-bold">
              {invoice.number}
              {rectification && <span className="ml-2 text-sm font-semibold text-danger">(anulada)</span>}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5">
            <dt className="text-ink-soft">Emitida el</dt>
            <dd className="font-bold">{adminDateTime(invoice.issuedAt)}</dd>
          </div>
          {rectification && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5">
              <dt className="text-ink-soft">Rectificativa</dt>
              <dd className="font-bold">
                {rectification.number}
                <span className="block text-sm font-semibold text-ink-soft">{adminDateTime(rectification.issuedAt)}</span>
              </dd>
            </div>
          )}
        </dl>
      ) : canIssue ? (
        <p className="text-sm">El pedido está cobrado: puedes emitir la factura y enviársela al cliente.</p>
      ) : status === 'pending_payment' ? (
        <p className="text-sm text-ink-soft">La factura se podrá emitir cuando el pedido esté cobrado.</p>
      ) : (
        <p className="text-sm text-ink-soft">Este pedido no llegó a facturarse.</p>
      )}

      {canRectify && (
        <Feedback kind="warning" className="mt-3">
          El pedido está {status === 'cancelled' ? 'cancelado' : 'reembolsado'} y tiene factura: emite la rectificativa para anularla.
        </Feedback>
      )}

      <div className="mt-3 flex flex-wrap gap-2.5">
        {canIssue && (
          <button type="button" onClick={() => ask('issue')} aria-expanded={pending === 'issue'} aria-controls={`${uid}-confirm`} className="btn btn-primary btn-block">
            <FileText size={18} aria-hidden="true" />
            Emitir factura
          </button>
        )}
        {invoice && (
          <>
            <Link href={rectification ? `${adminHref}?doc=rectificativa` : adminHref} className="btn btn-secondary">
              <Printer size={18} aria-hidden="true" />
              {rectification ? 'Ver rectificativa' : 'Ver e imprimir'}
            </Link>
            {rectification && (
              <Link href={adminHref} className="btn">
                Ver factura anulada
              </Link>
            )}
            <button type="button" onClick={() => ask('send')} aria-expanded={pending === 'send'} aria-controls={`${uid}-confirm`} className="btn">
              <Mail size={18} aria-hidden="true" />
              Enviar por email
            </button>
            {customerUrl && <CopyButton text={customerUrl} label="Copiar enlace del cliente" className="min-h-11" />}
          </>
        )}
        {canRectify && (
          <button type="button" onClick={() => ask('rectify')} aria-expanded={pending === 'rectify'} aria-controls={`${uid}-confirm`} className="btn btn-block">
            Emitir factura rectificativa
          </button>
        )}
      </div>

      {pending && (
        <div id={`${uid}-confirm`} role="group" aria-label={confirmText[pending].title} className="mt-4 space-y-3 rounded-xl border-2 border-ink bg-paper p-3.5">
          <p className="font-display text-lg font-semibold">{confirmText[pending].title}</p>
          <p className="text-sm">{confirmText[pending].body}</p>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={confirm} disabled={busy} aria-busy={busy} className="btn btn-primary flex-1">
              {busy ? 'Un momento…' : confirmText[pending].button}
            </button>
            <button type="button" onClick={() => setPending(null)} disabled={busy} className="btn">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="mt-3">
          <Feedback kind={notice.kind}>{notice.text}</Feedback>
        </div>
      )}
    </Panel>
  )
}
