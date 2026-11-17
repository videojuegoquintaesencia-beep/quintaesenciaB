import type { ReactNode } from 'react'
import { Breadcrumbs } from './Breadcrumbs'
import { LegalPrintButton } from './LegalPrintButton'

/** Fecha de la última revisión de los textos legales (se muestra en todas las páginas legales). */
export const LEGAL_LAST_UPDATED = '2026-11-16'

export interface LegalSection {
  id: string
  title: string
  content: ReactNode
}

/** Con tantas secciones o más se muestra el índice de contenidos. */
const TOC_FROM_SECTIONS = 5

const updatedLabel = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${LEGAL_LAST_UPDATED}T00:00:00Z`))

/** En impresión solo queda el documento: se ocultan cabecera y pie del sitio y se simplifica el color. */
const PRINT_CSS = `@media print {
  body:has([data-legal-page]) :is(header, footer):not([data-legal-page] *) { display: none !important; }
  body:has([data-legal-page]) .skip-link { display: none !important; }
  body:has([data-legal-page]), body:has([data-legal-page]) main { background: #fff !important; }
  [data-legal-page] { padding: 0 !important; background: #fff !important; color: #000; font-size: 11pt; }
  [data-legal-page] a { color: #000 !important; text-decoration: underline; }
  [data-legal-page] h2 { break-after: avoid; }
  [data-legal-page] section, [data-legal-page] dl { break-inside: avoid; }
}`

function TocList({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="grid gap-1.5">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex gap-2 rounded-lg px-2 py-1 font-bold text-ink-soft underline-offset-4 hover:bg-yellow-soft hover:text-ink hover:underline pointer-coarse:min-h-11 pointer-coarse:items-center">
            <span aria-hidden="true" className="w-6 shrink-0 text-right">{i + 1}.</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  )
}

/** Estructura común de las páginas legales: migas, título, fecha, índice y secciones numeradas. */
export function LegalPage({
  title,
  intro,
  crumb,
  sections,
}: {
  title: string
  intro: string
  /** Texto de la miga de pan (por defecto, el título). */
  crumb?: string
  sections: LegalSection[]
}) {
  const showToc = sections.length >= TOC_FROM_SECTIONS
  return (
    <div data-legal-page className="bg-cream py-8 sm:py-12">
      <style>{PRINT_CSS}</style>
      <div className="container-pop">
        <Breadcrumbs items={[{ label: 'Legal' }, { label: crumb ?? title }]} />
        <header className="mt-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg text-ink-soft">{intro}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <p className="text-sm font-bold text-ink-soft">
              Última actualización: <time dateTime={LEGAL_LAST_UPDATED}>{updatedLabel}</time>
            </p>
            <LegalPrintButton />
          </div>
        </header>

        <div className={showToc ? 'mt-10 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14' : 'mt-10'}>
          {showToc && (
            <>
              <details className="card-flat p-4 lg:hidden print:hidden">
                <summary className="-my-2 cursor-pointer py-2 font-display text-lg font-semibold">Índice de contenidos</summary>
                <nav aria-label="Índice de contenidos" className="mt-3">
                  <TocList sections={sections} />
                </nav>
              </details>
              <nav aria-label="Índice de contenidos" className="hidden lg:sticky lg:top-24 lg:block lg:self-start print:hidden">
                <p className="mb-2 font-display text-lg font-semibold">En esta página</p>
                <TocList sections={sections} />
              </nav>
            </>
          )}
          <div className="prose-pop min-w-0">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="scroll-mt-24">
                <h2 id={`${s.id}-titulo`} className={i === 0 ? 'mt-0' : undefined}>
                  {i + 1}. {s.title}
                </h2>
                {s.content}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
