import Link from 'next/link'
import { ArrowRight, Package, Palette, Printer } from 'lucide-react'
import { site } from '@/config/site'
import { Section, SectionHeading } from '@/components/ui/Section'
import { formatEUR } from '@/lib/format'

export function HowItWorks() {
  const { production, shipping } = site
  const steps = [
    {
      icon: Palette,
      title: 'Elige y diseña',
      text: 'Escoge el producto y el color, sube tu logo o tu foto, añade texto o pegatinas y comprueba el resultado y el precio al momento.',
      color: 'bg-pink',
    },
    {
      icon: Printer,
      title: 'Revisamos y producimos',
      text: `Revisamos tu diseño, lo imprimimos en DTF y lo fijamos con calor. La producción lleva entre ${production.leadDaysMin} y ${production.leadDaysMax} días laborables.`,
      color: 'bg-yellow',
    },
    {
      icon: Package,
      title: 'Lo recibes en casa',
      text: `Lo enviamos por ${shipping.carrierLabel} a toda España, salvo ${shipping.excludedZonesLabel}. El envío es gratis desde ${formatEUR(shipping.freeFromCents, { compact: true })}.`,
      color: 'bg-teal',
    },
  ]
  return (
    <Section aria-labelledby="como-titulo" tone="yellow" className="border-b-2 border-ink">
      <SectionHeading id="como-titulo" eyebrow="Cómo funciona" title="De tu idea a tu puerta en tres pasos" />
      <ol className="grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="card relative p-6 pt-9">
            <span
              aria-hidden="true"
              className={`absolute -top-5 left-6 grid h-12 w-12 place-items-center rounded-full border-2 border-ink font-display text-2xl font-bold shadow-pop-sm ${step.color}`}
            >
              {i + 1}
            </span>
            <step.icon aria-hidden="true" size={34} strokeWidth={2} className="text-violet-deep" />
            <h3 className="mt-3 text-2xl">
              <span className="sr-only">Paso {i + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-2 text-ink-soft">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8">
        <Link href="/como-funciona" className="inline-flex min-h-11 items-center gap-1.5 font-bold text-violet-deep underline underline-offset-4">
          Ver el proceso con más detalle <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </p>
    </Section>
  )
}
