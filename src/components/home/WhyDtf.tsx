import Link from 'next/link'
import { ArrowRight, Feather, Layers, Rainbow, Ruler, Shirt } from 'lucide-react'
import { Section, SectionHeading } from '@/components/ui/Section'

const BENEFITS = [
  { icon: Rainbow, title: 'Colores vivos y degradados', text: 'Fotos, degradados y muchos colores a la vez en el mismo diseño.', tone: 'bg-pink-soft' },
  { icon: Shirt, title: 'Funciona en algodón y muchas mezclas', text: 'Se adhiere al algodón y a muchas mezclas con poliéster, también sobre colores oscuros.', tone: 'bg-teal-soft' },
  { icon: Layers, title: 'Sin mínimo de unidades', text: 'Una sola camiseta o muchas: no hace falta preparar pantallas ni pedir una tirada mínima.', tone: 'bg-yellow-soft' },
  { icon: Ruler, title: 'Detalle fino', text: 'Líneas finas y textos pequeños salen nítidos si tu imagen tiene buena resolución.', tone: 'bg-violet-soft' },
  { icon: Feather, title: 'Tacto flexible', text: 'La capa de tinta se adapta a la tela y la acompaña al estirarla.', tone: 'bg-orange-soft' },
]

export function WhyDtf() {
  return (
    <Section aria-labelledby="dtf-titulo" tone="cream" className="border-b-2 border-ink">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-14">
        <div>
          <SectionHeading id="dtf-titulo" eyebrow="Por qué DTF" title="Una impresión pensada para diseños con color">
            DTF significa <em>Direct-To-Film</em>: imprimimos tu diseño sobre un film, le añadimos un adhesivo en polvo y lo pasamos a la
            prenda con una prensa de calor.
          </SectionHeading>
          <Link href="/como-funciona" className="btn btn-secondary">
            Cómo funciona el DTF
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b, i) => (
            <li key={b.title} className={`card-flat flex gap-4 p-5 ${b.tone} ${i === 4 ? 'sm:col-span-2' : ''}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-paper">
                <b.icon aria-hidden="true" size={26} strokeWidth={2.2} />
              </span>
              <div>
                <h3 className="text-xl">{b.title}</h3>
                <p className="mt-1 text-ink-soft">{b.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
