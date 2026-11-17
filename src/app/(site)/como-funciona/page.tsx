import type { Metadata } from 'next'
import Link from 'next/link'
import { Droplets, Layers, Palette, Package, ScanSearch, Shirt, Sparkles, Check, TriangleAlert } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { CareGuide } from '@/components/content/CareGuide'
import { CtaBand } from '@/components/content/CtaBand'
import { DtfLayers } from '@/components/content/DtfLayers'
import { FeatureGrid, type Feature } from '@/components/content/FeatureGrid'
import { PageHero } from '@/components/content/PageHero'
import { PrintAreaTable } from '@/components/content/PrintAreaTable'
import { StepList, type Step } from '@/components/content/StepList'
import { TechniqueTable } from '@/components/content/TechniqueTable'
import { pageMetadata } from '@/components/content/metadata'
import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'

export const metadata: Metadata = pageMetadata({
  title: 'Cómo funciona la impresión DTF y tu pedido',
  description:
    'Qué es el DTF, por qué encaja con la personalización, cómo se compara con vinilo, serigrafía y sublimación, plazos del pedido y cómo preparar tu diseño.',
  path: '/como-funciona',
})

const { production, shipping } = site

const DTF_STEPS: Step[] = [
  {
    title: 'Imprimimos en un film',
    text: 'Una impresora DTF deposita tu diseño sobre un film transparente: primero los colores (CMYK) y encima una capa de tinta blanca.',
  },
  {
    title: 'Aplicamos el adhesivo',
    text: 'Con la tinta aún húmeda, se cubre el film con un polvo adhesivo que solo se pega donde hay tinta.',
  },
  {
    title: 'Lo curamos',
    text: 'Se calienta el film para fundir el polvo y dejarlo listo para transferir. Hasta aquí el diseño sigue siendo del film.',
  },
  {
    title: 'Lo planchamos en la prenda',
    text: 'Con una prensa de calor, a la temperatura y la presión adecuadas, pasamos el diseño a la prenda y retiramos el film.',
  },
]

const WHY: Feature[] = [
  { icon: Palette, title: 'Todo el color', text: 'Fotos, degradados y sombras se imprimen tal cual, sin límite de colores ni pantallas que preparar.' },
  { icon: ScanSearch, title: 'Detalle fino', text: 'Líneas y textos pequeños salen nítidos siempre que el diseño tenga buena resolución.' },
  { icon: Shirt, title: 'Algodón y muchas mezclas', text: 'Funciona sobre algodón y sobre muchas mezclas con poliéster, como nuestras sudaderas.' },
  { icon: Layers, title: 'También sobre prendas oscuras', text: 'La base de tinta blanca hace que los colores se vean vivos sobre negro, azul marino o rojo.' },
  { icon: Package, title: 'Sin mínimo de unidades', text: 'Una camiseta o cien: se imprime a medida, sin cuota de preparación por diseño.' },
  { icon: Sparkles, title: 'Tacto flexible', text: 'El estampado es una capa fina que acompaña a la tela. Se nota ligeramente al tacto, pero no queda rígido.' },
]

const ORDER_STEPS: Step[] = [
  {
    title: 'Diseñas',
    text: 'Eliges producto y color en el personalizador, subes tu imagen o creas tu diseño con texto y elementos, y ves el precio al momento.',
  },
  {
    title: 'Revisamos tu archivo',
    text: 'Tras el pago miramos la resolución, el fondo y la colocación. Si algo puede afectar al resultado, te escribimos antes de imprimir.',
  },
  {
    title: 'Producimos',
    text: `Imprimimos, curamos y planchamos tu pedido en ${production.leadDaysMin} a ${production.leadDaysMax} días laborables.`,
  },
  {
    title: 'Enviamos',
    text: `Sale por ${shipping.carrierLabel} y te avisamos con el seguimiento. Envío gratis desde ${formatEUR(shipping.freeFromCents, { compact: true })}.`,
  },
]

const DO_LIST: { title: string; text: string }[] = [
  { title: 'PNG con fondo transparente', text: 'Si el fondo es blanco, se imprime en blanco. Un PNG transparente imprime solo tu diseño. Los SVG también valen.' },
  { title: '300 ppp al tamaño final', text: 'Para un diseño de 30 × 40 cm necesitas unos 3.543 × 4.724 píxeles. El personalizador te avisa si la imagen se queda corta.' },
  { title: 'Colores en RGB', text: 'Es el modo de las pantallas y de casi todos los programas. Los fluorescentes y los metalizados no se pueden reproducir con tinta.' },
  { title: 'Trazos y letras con cuerpo', text: 'Evita líneas más finas de 1 mm y textos de menos de 5 mm de alto: pierden definición y pueden no transferirse bien.' },
]

export default function ComoFuncionaPage() {
  return (
    <>
      <PageHero
        tone="yellow"
        crumbs={[{ label: 'Cómo funciona' }]}
        eyebrow="Impresión DTF"
        title={
          <>
            Tu diseño, tal y como lo <span className="squiggle-underline">imaginas</span>
          </>
        }
        actions={
          <>
            <ButtonLink href="/personalizar" size="lg">Diseña el tuyo</ButtonLink>
            <ButtonLink href="#prepara-tu-diseno" variant="secondary" size="lg">Prepara tu archivo</ButtonLink>
          </>
        }
      >
        Imprimimos con DTF, una técnica que permite colores sin límite, detalle fino y pedidos de una sola unidad. Aquí te
        explicamos cómo funciona y cómo sacarle el máximo partido.
      </PageHero>

      <Section aria-labelledby="que-es-dtf">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <SectionHeading id="que-es-dtf" eyebrow="Qué es el DTF" title="Del film a la prenda en cuatro pasos">
              DTF significa <em>Direct-To-Film</em>: el diseño se imprime primero en un film y después se transfiere a la prenda con calor.
            </SectionHeading>
            <StepList steps={DTF_STEPS} label="Pasos de la impresión DTF" compact />
          </div>
          <div className="lg:sticky lg:top-24">
            <DtfLayers />
          </div>
        </div>
      </Section>

      <Section tone="white" aria-labelledby="por-que-dtf">
        <SectionHeading id="por-que-dtf" eyebrow="Por qué DTF" title="Una técnica que encaja con lo personalizado">
          Sirve igual para un regalo único que para un pedido de equipo, y no condiciona tu diseño.
        </SectionHeading>
        <FeatureGrid features={WHY} />
      </Section>

      <Section tone="teal" aria-labelledby="comparativa">
        <SectionHeading id="comparativa" eyebrow="Comparativa" title="DTF, vinilo, serigrafía y sublimación">
          Cada técnica tiene su sitio. Esta tabla es una guía general, no una competición: el resultado depende del diseño, del
          tejido y de la cantidad.
        </SectionHeading>
        <TechniqueTable />
        <p className="mt-4 max-w-2xl text-sm text-ink-soft">
          Si no sabes qué te conviene para un proyecto concreto,{' '}
          <Link href="/contacto" className="font-bold text-violet-deep underline">
            cuéntanoslo
          </Link>{' '}
          y te orientamos.
        </p>
      </Section>

      <Section aria-labelledby="proceso">
        <SectionHeading id="proceso" eyebrow="Tu pedido" title="De la idea a tu puerta">
          Producción de {production.leadDaysMin} a {production.leadDaysMax} días laborables, más el envío por {shipping.carrierLabel}.
        </SectionHeading>
        <StepList steps={ORDER_STEPS} label="Pasos de tu pedido" />
      </Section>

      <Section tone="pink" id="prepara-tu-diseno" aria-labelledby="prepara-titulo">
        <SectionHeading id="prepara-titulo" eyebrow="Guía rápida" title="Prepara tu diseño">
          Con estos cuatro detalles tu estampado saldrá como esperas.
        </SectionHeading>
        <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            {DO_LIST.map((item) => (
              <li key={item.title} className="card flex gap-3 p-5">
                <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-teal">
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg">{item.title}</h3>
                  <p className="mt-1 text-ink-soft">{item.text}</p>
                </div>
              </li>
            ))}
            <li className="card flex gap-3 bg-yellow-soft p-5 sm:col-span-2">
              <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-yellow">
                <TriangleAlert className="size-4" strokeWidth={2.6} />
              </span>
              <div>
                <h3 className="text-lg">Comprueba que puedes usarlo</h3>
                <p className="mt-1 text-ink-soft">
                  Logos de marcas, personajes, fotos o ilustraciones de otras personas están protegidos. Imprime solo diseños propios o con
                  permiso: eres responsable de lo que subes.
                </p>
              </div>
            </li>
          </ul>
          <div>
            <h3 className="mb-3 text-xl">Tamaño máximo de cada zona</h3>
            <PrintAreaTable />
          </div>
        </div>
      </Section>

      <Section tone="white" id="cuidados" aria-labelledby="cuidados-titulo">
        <SectionHeading id="cuidados-titulo" eyebrow="Cuidados" title="Para que tu estampado dure más">
          Cada producto tiene sus consejos de lavado. Seguirlos ayuda a que los colores y el acabado se mantengan.
        </SectionHeading>
        <CareGuide />
        <p className="mt-6 flex max-w-2xl gap-2 text-ink-soft">
          <Droplets aria-hidden="true" className="mt-1 size-5 shrink-0 text-teal-deep" />
          No damos cifras de lavados porque dependen de la prenda, de cómo la laves y de cómo la uses.
        </p>
      </Section>

      <CtaBand
        title="¿Listo para crear la tuya?"
        actions={
          <>
            <ButtonLink href="/personalizar" size="lg">Empieza a diseñar</ButtonLink>
            <ButtonLink href="/preguntas-frecuentes" variant="secondary" size="lg">Ver preguntas frecuentes</ButtonLink>
          </>
        }
      >
        Elige un producto, sube tu imagen y ve cómo queda antes de pedirlo.
      </CtaBand>
    </>
  )
}
