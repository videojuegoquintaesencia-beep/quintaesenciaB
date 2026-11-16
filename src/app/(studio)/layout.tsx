import type { Metadata } from 'next'
import { StudioHeader } from '@/components/editor/StudioHeader'

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

/** Diseño de aplicación: cabecera compacta y el resto de la pantalla para el editor (sin pie de página). */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream">
      <a href="#editor" className="skip-link">Saltar al editor</a>
      <StudioHeader />
      <main id="editor" className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
