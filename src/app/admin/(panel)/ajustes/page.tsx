import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, AtSign, BadgeEuro, Building2, Truck, type LucideIcon } from 'lucide-react'
import { Feedback } from '@/components/admin/Feedback'
import { PageHeader } from '@/components/admin/PageHeader'
import { SectionStatusBadge } from '@/components/admin/settings/SectionStatusBadge'
import { sitePlaceholders } from '@/config/site'
import { getOverriddenSections, getSettings } from '@/lib/settings'
import { SETTINGS_SECTION_LABEL, type SettingsSection } from '@/lib/settings-schema'

export const metadata: Metadata = { title: 'Ajustes' }

interface Card {
  href: string
  title: string
  description: string
  icon: LucideIcon
  /** Secciones de la tabla `settings` que edita la página: basta con que una esté guardada para ser "Personalizada". */
  sections: SettingsSection[]
}

/** Las páginas de envíos/plazos y de precios las mantiene otra parte del panel: aquí solo se enlazan. */
const CARDS: Card[] = [
  {
    href: '/admin/ajustes/negocio',
    title: SETTINGS_SECTION_LABEL.business,
    description: 'Razón social, NIF, domicilio fiscal, datos registrales y proveedores que tratan datos. Salen en el aviso legal, la política de privacidad, el checkout y los emails.',
    icon: Building2,
    sections: ['business'],
  },
  {
    href: '/admin/ajustes/contacto',
    title: SETTINGS_SECTION_LABEL.contact,
    description: 'Email, teléfono, WhatsApp, Instagram, TikTok, dirección pública y horario. Lo que dejes vacío no se muestra en la web.',
    icon: AtSign,
    sections: ['contact'],
  },
  {
    href: '/admin/ajustes/envios',
    title: 'Envíos y plazos',
    description: 'Gastos de envío, importe para envío gratis, suplemento de Baleares, zonas sin envío y días de producción.',
    icon: Truck,
    sections: ['shipping', 'production'],
  },
  {
    href: '/admin/ajustes/precios',
    title: SETTINGS_SECTION_LABEL.pricing,
    description: 'Precio base de cada producto, suplementos de talla y color, escalones del estampado y descuentos por volumen.',
    icon: BadgeEuro,
    sections: ['pricing'],
  },
]

/** Nombre legible de cada dato de ejemplo que devuelve `sitePlaceholders()`. */
const PLACEHOLDER_LABEL: Record<string, string> = {
  'business.legalName': 'la razón social',
  'business.taxId': 'el NIF/CIF',
  'business.registeredAddress': 'el domicilio fiscal',
  'business.processors': 'los proveedores que tratan datos',
  'contact.email': 'el email de contacto',
}

export default async function SettingsIndexPage() {
  const [settings, overridden] = await Promise.all([getSettings(), getOverriddenSections()])
  const placeholders = sitePlaceholders(settings)
  const pendingBusiness = placeholders.some((p) => p.startsWith('business.'))
  const pendingContact = placeholders.some((p) => p.startsWith('contact.'))

  return (
    <>
      <PageHeader
        title="Ajustes"
        description="Los datos del negocio que usan la web, los emails y el panel. Lo que guardes aquí sustituye a los valores que vienen en el código, sin tocar nada más."
      />

      {placeholders.length > 0 && (
        <Feedback kind="error" className="mb-6">
          <p>
            <strong>Siguen siendo datos de ejemplo:</strong> {placeholders.map((p) => PLACEHOLDER_LABEL[p] ?? p).join(', ')}. Mientras no
            los sustituyas, el aviso legal, la política de privacidad, el checkout y los emails saldrán con datos ficticios, y en
            producción el arranque del servidor lo registra como error.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-bold">
            {pendingBusiness && (
              <Link href="/admin/ajustes/negocio" className="inline-flex min-h-11 items-center gap-1 text-violet-deep underline">
                Completar los datos del titular <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
            {pendingContact && (
              <Link href="/admin/ajustes/contacto" className="inline-flex min-h-11 items-center gap-1 text-violet-deep underline">
                Poner un email real <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </p>
        </Feedback>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon
          const custom = card.sections.some((s) => overridden.includes(s))
          return (
            <li key={card.href}>
              <Link
                href={card.href}
                className="flex h-full flex-col rounded-2xl border-2 border-ink bg-paper p-5 no-underline shadow-pop-sm transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-yellow-soft">
                    <Icon size={22} />
                  </span>
                  <SectionStatusBadge overridden={custom} />
                </div>
                <h2 className="mt-4 text-xl">{card.title}</h2>
                <p className="mt-1 flex-1 text-sm text-ink-soft">{card.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-violet-deep">
                  Editar <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="mt-6 text-sm text-ink-soft">
        «Por defecto» significa que se usan los valores escritos en el código (<code>src/config/site.ts</code> y{' '}
        <code>src/config/products.ts</code>). «Personalizada», que hay valores guardados desde el panel; puedes volver a los del
        código en cualquier momento desde cada sección.
      </p>
    </>
  )
}
