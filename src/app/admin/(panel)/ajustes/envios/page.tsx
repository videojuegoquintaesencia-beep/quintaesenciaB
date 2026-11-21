import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { ProductionForm } from '@/components/admin/settings/ProductionForm'
import { ShippingForm } from '@/components/admin/settings/ShippingForm'
import { requireAdmin } from '@/lib/auth'
import { getOverriddenSections, getSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Envíos y plazos' }

/** Importes y textos de envío, zonas excluidas y plazos de producción. Cada bloque se guarda por separado. */
export default async function ShippingSettingsPage() {
  await requireAdmin()
  const [settings, overridden] = await Promise.all([getSettings(), getOverriddenSections()])
  return (
    <>
      <PageHeader
        back={{ href: '/admin/ajustes', label: 'Ajustes' }}
        title="Envíos y plazos"
        description="Tarifas de envío, zonas a las que no se envía, textos que cita la tienda y plazos de producción. Se aplican al momento en el carrito, el checkout, las fichas, los emails y la página del pedido."
      />
      <div className="space-y-10">
        <section aria-labelledby="envios-titulo">
          <h2 id="envios-titulo" className="mb-4 text-2xl">
            Envíos
          </h2>
          <ShippingForm initial={settings.shipping} overridden={overridden.includes('shipping')} />
        </section>
        <section aria-labelledby="plazos-titulo">
          <h2 id="plazos-titulo" className="mb-4 text-2xl">
            Plazos de producción
          </h2>
          <ProductionForm initial={settings.production} overridden={overridden.includes('production')} />
        </section>
      </div>
    </>
  )
}
