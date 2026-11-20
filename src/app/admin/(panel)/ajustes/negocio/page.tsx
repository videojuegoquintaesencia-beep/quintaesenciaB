import type { Metadata } from 'next'
import Link from 'next/link'
import { Info } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Panel } from '@/components/admin/Panel'
import { BusinessSettingsForm } from '@/components/admin/settings/BusinessSettingsForm'
import { SectionStatusBadge } from '@/components/admin/settings/SectionStatusBadge'
import { getOverriddenSections, getSettings } from '@/lib/settings'
import { SETTINGS_SECTION_LABEL } from '@/lib/settings-schema'

export const metadata: Metadata = { title: SETTINGS_SECTION_LABEL.business }

const linkClass = 'font-bold text-violet-deep underline'

export default async function BusinessSettingsPage() {
  const [settings, overridden] = await Promise.all([getSettings(), getOverriddenSections()])
  const custom = overridden.includes('business')

  return (
    <>
      <PageHeader
        back={{ href: '/admin/ajustes', label: 'Todos los ajustes' }}
        title={SETTINGS_SECTION_LABEL.business}
        badge={<SectionStatusBadge overridden={custom} className="text-base" />}
        description="Quién está detrás de la tienda a efectos legales y fiscales. Los campos en rojo siguen con un dato de ejemplo."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <BusinessSettingsForm initial={settings.business} overridden={custom} />

        <Panel title="Para qué sirven" tone="yellow" icon={<Info size={20} />} id="ayuda" className="lg:sticky lg:top-6">
          <ul className="space-y-3 text-sm">
            <li>
              <strong>Aviso legal.</strong> El artículo 10 de la LSSI-CE obliga a identificar al titular de la web: nombre o razón
              social, NIF, domicilio y, si es una sociedad, sus datos registrales. Se muestran en{' '}
              <Link href="/legal/aviso-legal" target="_blank" rel="noopener" className={linkClass}>
                /legal/aviso-legal
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </Link>
              .
            </li>
            <li>
              <strong>Política de privacidad.</strong> El titular es el responsable del tratamiento, y los proveedores que tratan
              datos (alojamiento, base de datos y correo) deben constar como encargados. Ver{' '}
              <Link href="/legal/privacidad" target="_blank" rel="noopener" className={linkClass}>
                /legal/privacidad
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </Link>
              .
            </li>
            <li>
              <strong>Facturas.</strong> Razón social, NIF y domicilio fiscal son los datos del emisor en cada factura.
            </li>
            <li>
              <strong>Checkout y emails.</strong> El titular aparece en la información básica de protección de datos antes de pagar y en
              el pie de todos los emails.
            </li>
          </ul>
        </Panel>
      </div>
    </>
  )
}
