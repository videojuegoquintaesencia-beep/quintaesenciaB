import Link from 'next/link'
import { Building2, CircleCheck, Inbox, MessageSquare, Send } from 'lucide-react'
import type { Quote } from '@/lib/quotes'
import { adminShortDateTime, timeAgo } from '@/lib/admin/dates'
import { QuoteStatusBadge } from './StatusBadges'

/** Indicador de la propuesta de precio: enviada al cliente o ya aceptada (con pedido). */
function ProposalChip({ quote }: { quote: Quote }) {
  if (quote.kind !== 'quote' || !quote.proposalSentAt) return null
  const accepted = !!quote.orderId
  return (
    <span className={accepted ? 'chip bg-success-soft text-xs' : 'chip bg-sky-soft text-xs'}>
      {accepted ? <CircleCheck size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
      {accepted ? 'Propuesta aceptada' : 'Propuesta enviada'}
    </span>
  )
}

/** Lista compacta de presupuestos y mensajes (la misma en el resumen y en /admin/presupuestos). */
export function QuotesList({ quotes, label }: { quotes: Quote[]; label: string }) {
  return (
    <ul aria-label={label} className="space-y-3">
      {quotes.map((q) => (
        <li key={q.id}>
          <Link
            href={`/admin/presupuestos/${q.id}`}
            className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-paper p-4 text-ink no-underline shadow-pop-sm hover:bg-yellow-soft/50"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-violet-soft"
            >
              {q.kind === 'quote' ? <Inbox size={20} /> : <MessageSquare size={20} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="font-display text-lg font-semibold underline decoration-pink decoration-2 underline-offset-4">
                  {q.number}
                  <span className="sr-only">{q.kind === 'quote' ? ' (presupuesto)' : ' (mensaje)'}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <ProposalChip quote={q} />
                  <QuoteStatusBadge status={q.status} />
                </span>
              </span>
              <span className="mt-0.5 block truncate font-bold">{q.name}</span>
              {q.company && (
                <span className="flex items-center gap-1 truncate text-sm text-ink-soft">
                  <Building2 size={14} aria-hidden="true" />
                  {q.company}
                </span>
              )}
              <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{q.message}</span>
              <span className="mt-1.5 block text-xs font-semibold text-ink-soft">
                <time dateTime={q.createdAt} title={adminShortDateTime(q.createdAt)}>
                  {timeAgo(q.createdAt)}
                </time>
                {q.kind === 'quote' && q.quantity ? ` · ${q.quantity} uds.` : ''}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
