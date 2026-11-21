import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getSettings } from '@/lib/settings'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Los datos de contacto (pie y botón de WhatsApp) se editan en el panel: se leen aquí y bajan por props.
  const { contact } = await getSettings()
  return (
    <>
      <SiteHeader />
      <main id="contenido">{children}</main>
      <SiteFooter contact={contact} />
    </>
  )
}
