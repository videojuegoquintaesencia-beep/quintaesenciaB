'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { Home, Mail, RefreshCw } from 'lucide-react'
import { Sparkle, Star } from '@/components/home/Decor'
import { LogoMark } from '@/components/site/Logo'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

/** Error inesperado en una página. Sustituye al layout de la tienda, así que lleva su propia cabecera y pie. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
      <SiteHeader />
      <main id="contenido" className="bg-dots-soft overflow-hidden bg-cream">
        <div className="container-pop grid items-center gap-12 py-14 sm:py-24 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <p className="sticker bg-yellow-soft">Algo ha fallado</p>
            <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl">Vaya, esto no ha salido como esperábamos</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft sm:text-xl">
              Ha habido un problema al cargar esta página. No es culpa tuya. Prueba de nuevo y, si sigue pasando, escríbenos y lo
              solucionamos.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={() => retry()} className="btn btn-primary btn-lg">
                <RefreshCw aria-hidden="true" size={22} strokeWidth={2.4} />
                Intentar de nuevo
              </button>
              <Link href="/" className="btn btn-lg">
                <Home aria-hidden="true" size={22} strokeWidth={2.4} />
                Volver al inicio
              </Link>
            </div>
            <p className="mt-8">
              <Link href="/contacto" className="inline-flex min-h-8 items-center gap-2 font-bold text-violet-deep underline underline-offset-4">
                <Mail aria-hidden="true" size={18} />
                Contactar con nosotros
              </Link>
            </p>
            {error.digest && <p className="mt-6 text-sm text-ink-soft">Código de referencia: {error.digest}</p>}
          </div>
          <div aria-hidden="true" className="relative mx-auto grid aspect-square w-full max-w-xs place-items-center">
            <div className="absolute inset-[6%] rotate-6 rounded-[2.5rem] border-2 border-ink bg-pink-soft shadow-pop-lg" />
            <LogoMark size={190} className="relative -rotate-6" />
            <Star className="absolute right-[6%] top-[4%] h-12 w-12 rotate-12" />
            <Sparkle className="absolute bottom-[8%] left-[4%] h-10 w-10" fill="#ff4f9a" />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
