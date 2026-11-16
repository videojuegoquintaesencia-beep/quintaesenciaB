'use client'
// Sustituye al layout raíz: necesita sus propios estilos y tipografías.
import '@fontsource-variable/fredoka'
import '@fontsource-variable/nunito'
import './globals.css'
import { useEffect } from 'react'
import { LogoMark } from '@/components/site/Logo'

/** Último recurso cuando falla el layout raíz. No usa next/link: el enrutador podría no estar disponible. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">
        <title>Algo ha fallado | Pieza Única</title>
        <main className="bg-dots-soft grid min-h-dvh place-items-center bg-cream px-4 py-12">
          <div className="card max-w-xl p-8 text-center sm:p-10">
            <LogoMark size={72} className="mx-auto" />
            <h1 className="mt-5 text-3xl sm:text-4xl">Vaya, algo ha fallado</h1>
            <p className="mt-3 text-lg text-ink-soft">
              Ha ocurrido un error inesperado y no hemos podido mostrar la página. Inténtalo de nuevo o vuelve al inicio.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => retry()} className="btn btn-primary">
                Intentar de nuevo
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="btn">
                Volver al inicio
              </a>
            </div>
            {error.digest && <p className="mt-6 text-sm text-ink-soft">Código de referencia: {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  )
}
