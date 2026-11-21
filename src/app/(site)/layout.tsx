import { CatalogProvider } from '@/components/catalog/CatalogProvider'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getCatalog } from '@/lib/settings'

/**
 * El catálogo efectivo (precios, envíos y plazos del panel) se lee aquí una vez por petición y llega a los
 * componentes de cliente por contexto. No usa APIs de petición, así que las páginas siguen prerrenderizándose
 * y se regeneran cuando el panel guarda ajustes (revalidatePath).
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog()
  return (
    <CatalogProvider catalog={catalog}>
      <SiteHeader />
      <main id="contenido">{children}</main>
      <SiteFooter catalog={catalog} />
    </CatalogProvider>
  )
}
