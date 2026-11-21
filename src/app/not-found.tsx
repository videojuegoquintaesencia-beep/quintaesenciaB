import type { Metadata } from 'next'
import { NotFoundContent } from '@/components/site/NotFoundContent'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getCatalog, getSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Página no encontrada' }

/** 404 global (URLs que no existen). Se muestra fuera del layout de la tienda, así que lleva su propia cabecera y pie. */
export default async function NotFound() {
  const [{ contact }, catalog] = await Promise.all([getSettings(), getCatalog()])
  return (
    <>
      <SiteHeader />
      <main id="contenido">
        <NotFoundContent />
      </main>
      <SiteFooter contact={contact} catalog={catalog} />
    </>
  )
}
