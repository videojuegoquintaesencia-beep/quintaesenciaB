import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BadgePercent,
  Building2,
  Gift,
  HeartHandshake,
  LayoutGrid,
  Mail,
  MessageCircle,
  Package,
  PartyPopper,
  Phone,
  Receipt,
  ScanSearch,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeading } from '@/components/ui/Section'
import { DiscountTable } from '@/components/content/DiscountTable'
import { FeatureGrid, type Feature } from '@/components/content/FeatureGrid'
import { PageHero } from '@/components/content/PageHero'
import { QuoteForm } from '@/components/content/QuoteForm'
import { StepList, type Step } from '@/components/content/StepList'
import { pageMetadata } from '@/components/content/metadata'
import { telHref, whatsappHref } from '@/components/content/contact-info'
import { site } from '@/config/site'

export const metadata: Metadata = pageMetadata({
  title: 'Ropa, gorras y tazas personalizadas para empresas',
  description:
    'Merchandising, equipaciones y regalos de empresa con impresión DTF. Descuentos por volumen, atención personal y factura con IVA. Pide presupuesto.',
  path: '/empresas',
})

const { b2b, production } = site

const USES: Feature[] = [
  { icon: Users, title: 'Equipos y clubes', text: 'Camisetas y sudaderas para todo el equipo, con el mismo diseño y cada uno su talla.' },
  { icon: Building2, title: 'Empresas y plantillas', text: 'Prendas y gorras con tu logo para tu equipo de trabajo.' },
  { icon: PartyPopper, title: 'Eventos y celebraciones', text: 'Ferias, despedidas, bodas, carreras o fiestas: algo igual para todos los asistentes.' },
  { icon: ShoppingBag, title: 'Merchandising de marca', text: 'Camisetas, gorras y tazas con tu marca para vender o para repartir.' },
  { icon: Gift, title: 'Regalos de empresa', text: 'Un detalle útil y con personalidad para clientes, proveedores o empleados.' },
]

const BENEFITS: Feature[] = [
  { icon: BadgePercent, title: 'Precios por volumen', text: 'El descuento sube con las unidades de cada línea y se aplica solo, sin negociar nada.' },
  { icon: LayoutGrid, title: 'Varias referencias en un pedido', text: 'Camisetas, sudaderas, gorras y tazas con distintos diseños, colores y tallas en una misma solicitud.' },
  { icon: HeartHandshake, title: 'Atención personal', text: 'Hablas con personas, por email, teléfono o WhatsApp, de principio a fin.' },
  { icon: Receipt, title: 'Factura con IVA', text: 'Te preparamos la factura con los datos fiscales de tu empresa.' },
  { icon: ScanSearch, title: 'Revisión de tus archivos', text: 'Miramos tu logo antes de imprimir y te avisamos si hay algo que mejorar.' },
  { icon: Package, title: 'Sin mínimo', text: 'Puedes empezar con pocas unidades y repetir el pedido cuando lo necesites.' },
]

const STEPS: Step[] = [
  { title: 'Nos cuentas', text: 'Productos, unidades aproximadas, fecha y, si lo tienes, tu logo. Con el formulario de abajo es cuestión de minutos.' },
  { title: 'Te respondemos', text: 'En 1-2 días laborables te escribimos con una propuesta o con las dudas que necesitemos resolver.' },
  { title: 'Afinamos el diseño', text: 'Revisamos tus archivos, ajustamos tamaños y colocación y cerramos los detalles contigo.' },
  { title: 'Producimos y entregamos', text: `Imprimimos y enviamos tu pedido. En el presupuesto te damos un plazo concreto: los ${production.leadDaysMin} a ${production.leadDaysMax} días laborables son para pedidos habituales.` },
]

export default function EmpresasPage() {
  const whatsapp = whatsappHref('Hola, quería información para un pedido de empresa o equipo.')
  return (
    <>
      <PageHero
        tone="teal"
        crumbs={[{ label: 'Empresas' }]}
        eyebrow="Para empresas, equipos y eventos"
        title={
          <>
            Tu marca, en <span className="squiggle-underline">cada prenda</span>
          </>
        }
        actions={
          <>
            <ButtonLink href="#presupuesto" size="lg">Pedir presupuesto</ButtonLink>
            <ButtonLink href="/personalizar" variant="secondary" size="lg">Diseñar ahora</ButtonLink>
          </>
        }
      >
        Camisetas, sudaderas, gorras y tazas con tu logo o tu diseño, en la cantidad que necesites. Descuentos por volumen y una
        persona que te acompaña de principio a fin.
      </PageHero>

      <Section aria-labelledby="para-quien">
        <SectionHeading id="para-quien" eyebrow="Para quién" title="Pensado para pedidos de grupo" />
        <FeatureGrid features={USES} />
      </Section>

      <Section tone="white" aria-labelledby="ventajas">
        <SectionHeading id="ventajas" eyebrow="Ventajas" title="Lo que ganas pidiendo con nosotros" />
        <FeatureGrid features={BENEFITS} />
      </Section>

      <Section tone="yellow" id="precios-por-volumen" aria-labelledby="volumen">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHeading id="volumen" eyebrow="Precios por volumen" title="Cuantas más unidades, menos pagas por cada una">
              El descuento se aplica automáticamente a cada línea del pedido, es decir, a cada combinación de producto, color y diseño,
              según sus unidades totales.
            </SectionHeading>
            <ul className="grid gap-3 text-ink-soft">
              <li>
                Lo ves reflejado en el precio mientras diseñas en el{' '}
                <Link href="/personalizar" className="font-bold text-violet-deep underline">
                  personalizador
                </Link>
                .
              </li>
              <li>A partir de {b2b.quoteFromUnits} unidades, o con varios diseños, te recomendamos pedir presupuesto: así lo afinamos contigo.</li>
              <li>Todos los precios incluyen el {Math.round(site.vatRate * 100)}&nbsp;% de IVA.</li>
            </ul>
          </div>
          <DiscountTable />
        </div>
      </Section>

      <Section aria-labelledby="como-trabajamos">
        <SectionHeading id="como-trabajamos" eyebrow="Cómo trabajamos" title="Del primer mensaje a la entrega" />
        <StepList steps={STEPS} label="Cómo trabajamos con empresas" />
      </Section>

      <Section tone="pink" id="presupuesto" aria-labelledby="presupuesto-titulo">
        <div className="grid items-start gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div className="lg:sticky lg:top-24">
            <SectionHeading id="presupuesto-titulo" eyebrow="Presupuesto sin compromiso" title="Cuéntanos qué necesitas">
              Cuantos más datos nos des, más ajustado será el presupuesto. Si no lo tienes todo claro, no pasa nada: lo vemos juntos.
            </SectionHeading>
            <div className="card-flat bg-paper p-5">
              <p className="font-display text-lg font-semibold">¿Prefieres hablar?</p>
              <ul className="mt-3 grid gap-1 font-bold">
                {site.contact.email && (
                  <li>
                    <a href={`mailto:${site.contact.email}`} className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline [overflow-wrap:anywhere]">
                      <Mail aria-hidden="true" className="size-5 shrink-0" /> {site.contact.email}
                    </a>
                  </li>
                )}
                {site.contact.phone && (
                  <li>
                    <a href={telHref(site.contact.phone)} className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline">
                      <Phone aria-hidden="true" className="size-5 shrink-0" /> {site.contact.phone}
                    </a>
                  </li>
                )}
                {whatsapp && (
                  <li>
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline">
                      <MessageCircle aria-hidden="true" className="size-5 shrink-0" /> WhatsApp
                      <span className="sr-only"> (se abre en una pestaña nueva)</span>
                    </a>
                  </li>
                )}
              </ul>
              {site.contact.hours && <p className="mt-2 text-sm text-ink-soft">{site.contact.hours}</p>}
            </div>
          </div>
          <QuoteForm />
        </div>
      </Section>
    </>
  )
}
