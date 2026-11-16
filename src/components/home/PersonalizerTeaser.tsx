import Link from 'next/link'
import { ImagePlus, Sticker, Type, Wand2 } from 'lucide-react'
import { getProduct } from '@/config/products'
import { ProductMockup } from '@/components/mockups'
import { Section, SectionHeading } from '@/components/ui/Section'
import { tierPrice } from '@/lib/pricing'
import { formatEUR } from '@/lib/format'

const FEATURES = [
  { icon: ImagePlus, title: 'Sube tu logo o tu foto', text: 'PNG, JPG, WebP o SVG. Lo colocas, lo mueves y le cambias el tamaño.' },
  { icon: Type, title: 'Añade texto y pegatinas', text: 'Elige entre varias tipografías y adornos para completar tu diseño.' },
  { icon: Wand2, title: 'Ve el resultado y el precio al momento', text: 'El precio se actualiza mientras diseñas, con el IVA incluido.' },
]

/** Maqueta ilustrativa del personalizador. El precio del ejemplo sale del catálogo real. */
function EditorPreview() {
  const tee = getProduct('camiseta')
  const area = tee?.printTiers.frente
  const printCents = tierPrice(area, 250)
  const totalCents = tee ? tee.basePriceCents + printCents : 0

  return (
    <figure className="card overflow-hidden" aria-label="Ilustración del personalizador">
      <div aria-hidden="true" className="flex items-center gap-2 border-b-2 border-ink bg-ink px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-pink" />
        <span className="h-3 w-3 rounded-full bg-yellow" />
        <span className="h-3 w-3 rounded-full bg-teal" />
        <span className="ml-3 font-display text-sm font-semibold text-cream">Personalizador</span>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-0">
        <div aria-hidden="true" className="flex flex-col gap-3 border-r-2 border-ink bg-violet-soft p-3">
          {[ImagePlus, Type, Sticker].map((Icon, i) => (
            <span
              key={i}
              className={`grid h-11 w-11 place-items-center rounded-xl border-2 border-ink ${i === 0 ? 'bg-yellow shadow-pop-sm' : 'bg-paper'}`}
            >
              <Icon size={22} strokeWidth={2.2} />
            </span>
          ))}
        </div>
        <div className="bg-dots-soft grid place-items-center bg-pink-soft p-4 sm:p-6">
          <ProductMockup productId="camiseta" colorId="blanco" guides label="" className="h-auto w-full max-w-[17rem]" />
        </div>
      </div>
      {tee && (
        <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-2 border-ink bg-paper px-4 py-3 text-sm">
          <span className="text-ink-soft">Ejemplo: camiseta con un estampado en el frente de hasta 250 cm²</span>
          <span className="font-display text-xl font-semibold">{formatEUR(totalCents)}</span>
        </figcaption>
      )}
    </figure>
  )
}

export function PersonalizerTeaser() {
  return (
    <Section aria-labelledby="personalizador-titulo" tone="teal" className="border-b-2 border-ink">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <SectionHeading id="personalizador-titulo" eyebrow="El personalizador" title="Diséñalo tú, sin saber de diseño">
            Una herramienta sencilla para crear tu pieza en el navegador, con el producto delante y sin descargar nada.
          </SectionHeading>
          <ul className="grid gap-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-paper shadow-pop-sm">
                  <f.icon aria-hidden="true" size={24} strokeWidth={2.2} />
                </span>
                <div>
                  <h3 className="text-xl">{f.title}</h3>
                  <p className="mt-0.5 text-ink-soft">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/personalizar" className="btn btn-primary btn-lg mt-8">
            <Wand2 aria-hidden="true" size={22} strokeWidth={2.4} />
            Abrir el personalizador
          </Link>
        </div>
        <EditorPreview />
      </div>
    </Section>
  )
}
