import { CatalogProvider } from '@/components/catalog/CatalogProvider'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getCatalog, getSettings } from '@/lib/settings'

/**
 * El catálogo efectivo (precios, envíos y plazos del panel) y los datos de contacto (pie y botón de WhatsApp) se leen
 * aquí una vez por petición: el catálogo llega a los componentes de cliente por contexto y el contacto baja por props.
 * No usa APIs de petición, así que las páginas siguen prerrenderizándose y se regeneran cuando el panel guarda
 * ajustes (revalidatePath).
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [catalog, { contact }] = await Promise.all([getCatalog(), getSettings()])
  return (
    <CatalogProvider catalog={catalog}>
      <SiteHeader />
      <main id="contenido">{children}</main>
      <SiteFooter contact={contact} catalog={catalog} />
    </CatalogProvider>
  )
}
