import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { PricingForm } from '@/components/admin/settings/PricingForm'
import { requireAdmin } from '@/lib/auth'
import { getOverriddenSections, getSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Precios y descuentos' }

/** Precios por producto, escalones del estampado, topes de unidades y descuentos por volumen. */
export default async function PricingSettingsPage() {
  await requireAdmin()
  const [settings, overridden] = await Promise.all([getSettings(), getOverriddenSections()])
  return (
    <>
      <PageHeader
        back={{ href: '/admin/ajustes', label: 'Ajustes' }}
        title="Precios y descuentos"
        description="Lo que cobra la tienda por cada producto, su estampado y sus suplementos, y el descuento por volumen. Los cambios se aplican al momento en el editor, el carrito, el checkout y las fichas; los pedidos ya creados no cambian."
      />
      <PricingForm initial={settings.pricing} overridden={overridden.includes('pricing')} />
    </>
  )
}
