import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { PrintButton } from '@/components/admin/PrintButton'
import { ProductionSheet } from '@/components/admin/ProductionSheet'
import { site } from '@/config/site'
import { isValidId } from '@/lib/ids'
import { loadOrder } from '@/lib/admin/queries'
import { getSettings } from '@/lib/settings'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const order = isValidId(id) ? await loadOrder(id) : null
  return { title: order ? `Producción ${order.number}` : 'Hoja de producción' }
}

/** Al imprimir, la barra lateral, los títulos y los botones desaparecen y solo queda la hoja en A4. */
const PRINT_CSS = `
@page { size: A4 portrait; margin: 10mm; }
@media print {
  html, body { background: #fff !important; }
}
`

export default async function ProductionPage({ params }: Props) {
  const { id } = await params
  if (!isValidId(id)) notFound()
  const order = await loadOrder(id)
  if (!order) notFound()
  // Remite de la etiqueta: dirección pública del taller o, si no hay, el domicilio fiscal (ajustes del panel).
  const { business, contact } = await getSettings()
  const sender = [site.name, contact.address || business.registeredAddress, contact.phone].filter(Boolean).join(' · ')

  return (
    <>
      <style>{PRINT_CSS}</style>
      <PageHeader
        back={{ href: `/admin/pedidos/${order.id}`, label: `Volver al pedido ${order.number}` }}
        title="Hoja de producción"
        description="Imprímela en A4 y marca cada paso a medida que avanzas. También puedes marcar las casillas en pantalla."
        actions={<PrintButton className="btn btn-primary btn-lg" />}
      />
      <ProductionSheet order={order} sender={sender} />
    </>
  )
}
