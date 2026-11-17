import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'
import { QUANTITY_DISCOUNTS } from '@/config/products'
import { site } from '@/config/site'
import { Section } from '@/components/ui/Section'

const AUDIENCES = ['Equipos', 'Empresas', 'Eventos']

export function BusinessStrip() {
  const discounts = QUANTITY_DISCOUNTS.filter((d) => d.pct > 0)
  return (
    <Section aria-labelledby="empresas-titulo" tone="ink" className="border-b-2 border-ink">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <ul className="flex flex-wrap gap-2.5" aria-label="Para quién">
            {AUDIENCES.map((a, i) => (
              <li
                key={a}
                className={`chip text-base ${['bg-pink', 'bg-yellow', 'bg-teal'][i]}`}
              >
                {a}
              </li>
            ))}
          </ul>
          <h2 id="empresas-titulo" className="mt-5 text-3xl text-cream sm:text-5xl">
            ¿Pides para un equipo? <span className="text-yellow">Cuantas más unidades, menos pagas por cada una</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg text-cream/85">
            Uniformes, merchandising, equipos deportivos, despedidas o eventos. Los descuentos por volumen se aplican solos en el
            personalizador. Y si necesitas ayuda o pides {site.b2b.quoteFromUnits} unidades o más, te preparamos un presupuesto sin compromiso.
          </p>
          <Link href="/empresas" className="btn btn-secondary btn-lg mt-8 shadow-[4px_4px_0_0_var(--color-pink)]">
            <FileText aria-hidden="true" size={22} strokeWidth={2.4} />
            Pedir presupuesto
            <ArrowRight aria-hidden="true" size={20} />
          </Link>
        </div>

        <div className="rounded-pop border-2 border-cream/40 bg-cream/5 p-6">
          <h3 className="font-display text-xl text-cream">Descuento por unidades iguales</h3>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {discounts.map((d, i) => (
              <li
                key={d.minQty}
                className={`rounded-2xl border-2 border-ink p-4 text-ink shadow-[4px_4px_0_0_var(--color-cream)] ${['bg-pink-soft', 'bg-yellow-soft', 'bg-teal-soft', 'bg-violet-soft'][i % 4]} ${i === discounts.length - 1 && discounts.length % 2 === 1 ? 'col-span-2' : ''}`}
              >
                <p className="font-display text-3xl font-bold leading-none">{d.pct}&nbsp;%</p>
                <p className="mt-1.5 text-sm font-bold">desde {d.minQty} unidades</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
