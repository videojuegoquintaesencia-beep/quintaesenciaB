import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'
import type { InvoiceDocument, InvoiceLine, InvoiceParty } from '@/lib/invoice-document'

/** Fecha completa en la hora de España: "21 de noviembre de 2026". */
const longDate = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'long' })
const dateTime = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'long', timeStyle: 'short' })

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : longDate.format(d)
}
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateTime.format(d)
}

/** "21 %" con espacio indivisible, para que el tipo no se parta en dos líneas en la tabla. */
const pct = (rate: number) => `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(rate * 100)} %`

export function invoiceTitle(doc: Pick<InvoiceDocument, 'kind'>): string {
  return doc.kind === 'rectification' ? 'Factura rectificativa' : 'Factura'
}

function Party({ title, party, extra }: { title: string; party: InvoiceParty; extra?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h2 className="text-xs font-extrabold uppercase tracking-widest">{title}</h2>
      <p className="mt-1 break-words text-lg font-bold leading-snug">{party.name}</p>
      {party.attention && <p className="break-words">Att.: {party.attention}</p>}
      {party.taxId && <p>NIF/CIF {party.taxId}</p>}
      {party.addressLines.map((l, i) => (
        <p key={i} className="break-words">
          {l}
        </p>
      ))}
      {extra}
    </div>
  )
}

const COLUMNS = ['Descripción', 'Uds.', 'Precio ud. (sin IVA)', 'Base imponible', 'IVA', 'Cuota IVA', 'Importe'] as const

function LinesTable({ lines }: { lines: InvoiceLine[] }) {
  return (
    <table className="w-full border-collapse text-sm max-sm:hidden print:table">
      <thead>
        <tr className="border-b-2 border-black text-left">
          {COLUMNS.map((c, i) => (
            <th key={c} scope="col" className={`py-2 pr-3 align-bottom text-xs font-extrabold uppercase tracking-wide ${i === 0 ? '' : 'text-right'}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className="break-inside-avoid border-b border-black/30 align-top">
            <th scope="row" className="py-2.5 pr-3 text-left font-normal">
              <span className="font-bold">{l.description}</span>
              {l.detail && <span className="block text-xs">{l.detail}</span>}
            </th>
            <td className="py-2.5 pr-3 text-right tabular-nums">{l.units}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums">{formatEUR(l.unitNetCents)}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums">{formatEUR(l.netCents)}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums">{pct(l.vatRate)}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums">{formatEUR(l.vatCents)}</td>
            <td className="py-2.5 text-right font-bold tabular-nums">{formatEUR(l.grossCents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** En pantallas estrechas cada concepto se lee como una ficha (en papel siempre va la tabla). */
function LinesCards({ lines }: { lines: InvoiceLine[] }) {
  const cell = (label: string, value: string) => (
    <div className="flex justify-between gap-3 border-t border-black/20 py-1 text-sm">
      <dt>{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  )
  return (
    <ul className="space-y-3 sm:hidden print:hidden">
      {lines.map((l, i) => (
        <li key={i} className="rounded-lg border-2 border-black p-3">
          <p className="font-bold">{l.description}</p>
          {l.detail && <p className="text-xs">{l.detail}</p>}
          <dl className="mt-2">
            {cell('Unidades', String(l.units))}
            {cell('Precio ud. (sin IVA)', formatEUR(l.unitNetCents))}
            {cell('Base imponible', formatEUR(l.netCents))}
            {cell(`IVA ${pct(l.vatRate)}`, formatEUR(l.vatCents))}
            {cell('Importe', formatEUR(l.grossCents))}
          </dl>
        </li>
      ))}
    </ul>
  )
}

/**
 * Factura en formato A4 (y legible en pantalla): número y serie, fecha de expedición, emisor con NIF y domicilio,
 * destinatario, conceptos con base, tipo y cuota, totales, forma de pago y pie legal. En blanco y negro.
 */
export function InvoiceSheet({ doc }: { doc: InvoiceDocument }) {
  const rect = doc.kind === 'rectification'
  const title = invoiceTitle(doc)
  return (
    <article
      aria-label={`${title} ${doc.number}`}
      className="mx-auto w-full max-w-[210mm] rounded-2xl border-2 border-ink bg-white p-5 text-black shadow-pop-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      {doc.payment.demo && (
        <p role="note" className="mb-6 border-[3px] border-dashed border-black p-3 text-center text-lg font-extrabold uppercase tracking-wider">
          Demostración · sin validez
          <span className="block text-xs font-bold normal-case tracking-normal">
            El pago de este pedido se simuló en modo demostración: no se ha cobrado nada y este documento no es una factura real.
          </span>
        </p>
      )}

      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 border-b-[4px] border-black pb-5">
        <div className="min-w-0">
          <p className="text-sm font-extrabold uppercase tracking-widest">{title}</p>
          <p className="font-display text-4xl font-bold leading-none sm:text-5xl">{doc.number}</p>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
            <dt className="font-bold">Fecha de expedición</dt>
            <dd>{fmtDate(doc.issuedAt)}</dd>
            <dt className="font-bold">Pedido</dt>
            <dd>
              {doc.order.number} · {fmtDate(doc.order.createdAt)}
            </dd>
            {rect && doc.rectifies && (
              <>
                <dt className="font-bold">Rectifica a</dt>
                <dd>
                  Factura {doc.rectifies.number} del {fmtDate(doc.rectifies.issuedAt)}
                </dd>
              </>
            )}
          </dl>
        </div>
        <p className="font-display text-2xl font-bold leading-none sm:text-3xl">{site.name}</p>
      </header>

      <section aria-label="Emisor y destinatario" className="grid gap-6 border-b-2 border-black py-5 sm:grid-cols-2 sm:gap-10">
        <Party
          title="Emisor"
          party={doc.issuer}
          extra={
            (doc.issuer.email || doc.issuer.phone) && (
              <p className="mt-1 break-words text-sm">{[doc.issuer.email, doc.issuer.phone].filter(Boolean).join(' · ')}</p>
            )
          }
        />
        <Party title="Destinatario" party={doc.recipient} />
      </section>

      {rect && doc.rectifies && (
        <p className="mt-5 rounded-lg border-2 border-black p-3 text-sm">
          <strong>Motivo de la rectificación:</strong> {doc.rectifies.reason} Esta factura rectificativa anula íntegramente la
          factura {doc.rectifies.number}; por eso sus importes figuran en negativo.
        </p>
      )}

      <section aria-label="Conceptos" className="py-5">
        <LinesTable lines={doc.lines} />
        <LinesCards lines={doc.lines} />
      </section>

      <section aria-label="Totales" className="flex justify-end">
        <dl className="w-full max-w-xs border-t-2 border-black pt-2">
          <div className="flex justify-between gap-4 py-1">
            <dt>Base imponible</dt>
            <dd className="tabular-nums">{formatEUR(doc.totals.netCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <dt>IVA {pct(doc.vatRate)}</dt>
            <dd className="tabular-nums">{formatEUR(doc.totals.vatCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t-2 border-black py-2 text-lg font-extrabold">
            <dt>Total</dt>
            <dd className="font-display text-2xl tabular-nums">{formatEUR(doc.totals.grossCents)}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Pago" className="mt-5 border-t border-black/30 pt-3 text-sm">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
          <dt className="font-bold">Forma de pago</dt>
          <dd>{doc.payment.method}</dd>
          <dt className="font-bold">{rect ? 'Pagado el' : 'Fecha de pago'}</dt>
          <dd>{doc.payment.paidAt ? fmtDateTime(doc.payment.paidAt) : '—'}</dd>
          {doc.payment.reference && (
            <>
              <dt className="font-bold">Referencia</dt>
              <dd className="break-all font-mono text-xs">{doc.payment.reference}</dd>
            </>
          )}
        </dl>
        {rect && <p className="mt-2">El importe se ha devuelto al cliente por el mismo medio de pago.</p>}
        <p className="mt-2 text-xs">
          Precios con el IVA incluido; la base de cada concepto es su importe sin el IVA y el precio por unidad es la media de la
          línea una vez aplicados suplementos y descuentos.
        </p>
      </section>

      <footer className="mt-6 border-t-2 border-black pt-3 text-xs">
        Factura emitida por {doc.issuer.name}
        {doc.issuer.taxId ? `, NIF/CIF ${doc.issuer.taxId}` : ''}.{doc.issuer.registry ? ` Inscrita en ${doc.issuer.registry}.` : ''}
      </footer>
    </article>
  )
}
