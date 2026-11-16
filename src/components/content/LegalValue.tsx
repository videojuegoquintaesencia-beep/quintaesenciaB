import type { ReactNode } from 'react'
import { site } from '@/config/site'

/**
 * Dato del titular. Si sigue siendo un marcador "[COMPLETAR: …]" se resalta para que el dueño del negocio
 * lo vea antes de publicar la web.
 */
export function LegalValue({ children }: { children: string }) {
  if (!children.startsWith('[')) return <>{children}</>
  return <mark className="rounded-md bg-yellow px-1.5 py-0.5 font-bold text-ink print:bg-transparent print:underline">{children}</mark>
}

export function LegalFacts({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="card-flat my-5 grid gap-x-6 gap-y-3 p-4 sm:grid-cols-[11rem_1fr] sm:p-5 print:border print:border-black">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-0.5 sm:contents">
          <dt className="font-display font-semibold">{row.label}</dt>
          <dd className="[overflow-wrap:anywhere] text-ink-soft sm:pt-0.5">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Datos identificativos del titular (LSSI-CE art. 10), con los campos vacíos omitidos. */
export function OwnerFacts() {
  const business: Record<keyof typeof site.business, string> = site.business
  const contact: Record<keyof typeof site.contact, string> = site.contact
  const rows: { label: string; value: ReactNode }[] = [
    { label: 'Titular', value: <LegalValue>{business.legalName}</LegalValue> },
    { label: 'NIF/CIF', value: <LegalValue>{business.taxId}</LegalValue> },
    { label: 'Domicilio', value: <LegalValue>{business.registeredAddress}</LegalValue> },
  ]
  if (business.registry) rows.push({ label: 'Registro', value: <LegalValue>{business.registry}</LegalValue> })
  if (contact.email) rows.push({ label: 'Email', value: <a href={`mailto:${contact.email}`} className="font-bold text-violet-deep underline">{contact.email}</a> })
  if (contact.phone) rows.push({ label: 'Teléfono', value: contact.phone })
  rows.push({ label: 'Sitio web', value: site.url.replace(/^https?:\/\//, '') })
  return <LegalFacts rows={rows} />
}
