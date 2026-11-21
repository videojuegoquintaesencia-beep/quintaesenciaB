import type { Metadata } from 'next'
import { CatalogProvider } from '@/components/catalog/CatalogProvider'
import { StudioHeader } from '@/components/editor/StudioHeader'
import { getCatalog } from '@/lib/settings'

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

/**
 * Diseño de aplicación: cabecera compacta y el resto de la pantalla para el editor (sin pie de página).
 * El editor calcula el precio en vivo con el catálogo efectivo, que llega por contexto desde aquí.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog()
  return (
    <CatalogProvider catalog={catalog}>
      <div className="flex h-dvh flex-col overflow-hidden bg-cream">
        <a href="#editor" className="skip-link">Saltar al editor</a>
        <StudioHeader />
        <main id="editor" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </CatalogProvider>
  )
}
