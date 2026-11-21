import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'
import { proposalLineDetail, type Proposal } from '@/lib/proposal'

/** Líneas y totales de una propuesta (la misma vista en la página del cliente y en el panel). */
export function ProposalSummary({ proposal, className }: { proposal: Proposal; className?: string }) {
  return (
    <div className={className}>
      <ul className="divide-y-2 divide-ink/15" aria-label="Líneas de la propuesta">
        {proposal.lines.map((line) => (
          <li key={line.lineId} className="flex items-start justify-between gap-4 py-3 first:pt-0">
            <div className="min-w-0">
              <p className="font-extrabold [overflow-wrap:anywhere]">{line.description}</p>
              <p className="text-sm text-ink-soft">{proposalLineDetail(line)}</p>
            </div>
            <p className="shrink-0 font-bold tabular-nums">{formatEUR(line.totalCents)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1.5 border-t-2 border-ink pt-3">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Subtotal</dt>
          <dd className="font-bold tabular-nums">{formatEUR(proposal.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Envío</dt>
          <dd className="font-bold tabular-nums">{proposal.shippingCents === 0 ? 'Incluido' : formatEUR(proposal.shippingCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-xl">
          <dt className="font-display font-semibold">Total</dt>
          <dd className="font-display font-semibold tabular-nums">{formatEUR(proposal.totalCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-sm text-ink-soft">
          <dt>IVA incluido ({Math.round(site.vatRate * 100)}&nbsp;%)</dt>
          <dd className="tabular-nums">{formatEUR(proposal.vatCents)}</dd>
        </div>
      </dl>
    </div>
  )
}
