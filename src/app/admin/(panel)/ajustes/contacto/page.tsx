import type { Metadata } from 'next'
import Link from 'next/link'
import { Info } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Panel } from '@/components/admin/Panel'
import { ContactSettingsForm } from '@/components/admin/settings/ContactSettingsForm'
import { SectionStatusBadge } from '@/components/admin/settings/SectionStatusBadge'
import { getOverriddenSections, getSettings } from '@/lib/settings'
import { SETTINGS_SECTION_LABEL } from '@/lib/settings-schema'

export const metadata: Metadata = { title: SETTINGS_SECTION_LABEL.contact }

const linkClass = 'font-bold text-violet-deep underline'

export default async function ContactSettingsPage() {
  const [settings, overridden] = await Promise.all([getSettings(), getOverriddenSections()])
  const custom = overridden.includes('contact')

  return (
    <>
      <PageHeader
        back={{ href: '/admin/ajustes', label: 'Todos los ajustes' }}
        title={SETTINGS_SECTION_LABEL.contact}
        badge={<SectionStatusBadge overridden={custom} className="text-base" />}
        description="Cómo pueden contactar contigo los clientes. Un campo vacío se oculta en toda la web."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ContactSettingsForm initial={settings.contact} overridden={custom} />

        <Panel title="Dónde se usan" tone="yellow" icon={<Info size={20} />} id="ayuda" className="lg:sticky lg:top-6">
          <ul className="space-y-3 text-sm">
            <li>
              <strong>Pie de la web y página de contacto.</strong> Email, teléfono, WhatsApp, redes, dirección y horario. Ver{' '}
              <Link href="/contacto" target="_blank" rel="noopener" className={linkClass}>
                /contacto
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </Link>
              .
            </li>
            <li>
              <strong>Botón flotante de WhatsApp.</strong> Solo aparece si hay un número de WhatsApp.
            </li>
            <li>
              <strong>Emails a clientes.</strong> El email es la dirección de respuesta y figura en el pie junto con el teléfono.
            </li>
            <li>
              <strong>Avisos para ti.</strong> Los pedidos, presupuestos y mensajes nuevos llegan a este email, salvo que definas
              otro en la variable <code>ADMIN_NOTIFY_EMAIL</code>.
            </li>
            <li>
              <strong>Hoja de producción.</strong> La dirección pública y el teléfono son el remite de la etiqueta de envío.
            </li>
          </ul>
        </Panel>
      </div>
    </>
  )
}
