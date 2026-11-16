import type { Metadata } from 'next'

/** Todo el panel queda fuera de los buscadores. */
export const metadata: Metadata = {
  title: { default: 'Panel de gestión', template: '%s · Panel' },
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
