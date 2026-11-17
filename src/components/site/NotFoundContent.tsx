import Link from 'next/link'
import { Home, Mail, ShoppingBag, Wand2 } from 'lucide-react'
import { PRODUCTS } from '@/config/products'
import { Star } from '@/components/home/Decor'
import { ProductShowcase } from '@/components/mockups'

/** Cuerpo de la página 404 (sin cabecera, pie ni <main>): lo comparten el 404 global y el de la tienda. */
export function NotFoundContent() {
  return (
    <>
      <section className="bg-dots-soft overflow-hidden border-b-2 border-ink bg-cream">
        <div className="container-pop grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <p className="sticker bg-pink-soft">Error 404</p>
            <h1 className="mt-5 text-5xl sm:text-7xl">Esta página se ha perdido</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft sm:text-xl">
              No encontramos lo que buscas. Puede que el enlace esté mal escrito o que la página ya no exista. Te dejamos algunos
              sitios para retomar el camino.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link href="/" className="btn btn-primary btn-lg">
                <Home aria-hidden="true" size={22} strokeWidth={2.4} />
                Volver al inicio
              </Link>
              <Link href="/personalizar" className="btn btn-secondary btn-lg">
                <Wand2 aria-hidden="true" size={22} strokeWidth={2.4} />
                Diseña el tuyo
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-bold">
              <li>
                <Link href="/productos" className="inline-flex min-h-8 items-center gap-2 text-violet-deep underline underline-offset-4">
                  <ShoppingBag aria-hidden="true" size={18} />
                  Ver productos
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="inline-flex min-h-8 items-center gap-2 text-violet-deep underline underline-offset-4">
                  <Mail aria-hidden="true" size={18} />
                  Escribirnos
                </Link>
              </li>
            </ul>
          </div>

          <div aria-hidden="true" className="relative mx-auto aspect-[5/4] w-full max-w-md">
            <div className="absolute inset-[4%] rotate-3 rounded-[2.5rem] border-2 border-ink bg-teal-soft shadow-pop-lg" />
            <div className="absolute left-[4%] top-[8%] w-[46%] -rotate-12 [filter:drop-shadow(5px_6px_0_rgba(27,19,64,1))]">
              <ProductShowcase productId="gorra" colorId="rosa" variant={3} label="" className="h-auto w-full" />
            </div>
            <div className="absolute bottom-[6%] right-[6%] w-[48%] rotate-[8deg] [filter:drop-shadow(5px_6px_0_rgba(27,19,64,1))]">
              <ProductShowcase productId="taza" variant="icon" art={4} label="" className="h-auto w-full" />
            </div>
            <Star className="absolute right-[10%] top-[6%] h-12 w-12 rotate-12" />
            <span className="sticker absolute bottom-[8%] left-[6%] bg-yellow text-2xl">¿404?</span>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16" aria-labelledby="mientras-tanto">
        <div className="container-pop">
          <h2 id="mientras-tanto" className="text-2xl sm:text-3xl">
            Mientras tanto, ¿qué tal personalizar algo?
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <li key={p.id}>
                <Link href={`/productos/${p.slug}`} className="card card-hover flex min-h-14 items-center justify-between gap-3 px-5 py-4 font-display text-lg font-semibold">
                  {p.namePlural}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
