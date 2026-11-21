import type { Metadata } from 'next'
import Link from 'next/link'
import { TrackingForm } from '@/components/checkout/TrackingForm'
import { getSettings } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Seguimiento de pedido',
  description: 'Consulta el estado de tu pedido con tu número de pedido y tu email.',
  // Página de uso privado: no se indexa (y no hay que bloquearla en robots.txt para que los buscadores vean este noindex).
  robots: { index: false, follow: true },
}

export default async function TrackingPage() {
  const { contact } = await getSettings()
  return (
    <div className="container-pop py-10 sm:py-14">
      <div className="mx-auto max-w-xl">
        <h1 className="text-4xl sm:text-5xl">Seguimiento de pedido</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Escribe tu número de pedido y el email con el que compraste y te mostramos en qué punto está.
        </p>
        <div className="mt-8">
          <TrackingForm />
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          ¿No encuentras tu pedido? Escríbenos desde la página de{' '}
          <Link href="/contacto" className="font-bold text-violet-deep underline">
            contacto
          </Link>
          {contact.email ? ` o a ${contact.email}.` : '.'}
        </p>
      </div>
    </div>
  )
}
