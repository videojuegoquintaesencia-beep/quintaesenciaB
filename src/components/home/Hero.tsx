import Link from 'next/link'
import { ArrowRight, Building2, Wand2 } from 'lucide-react'
import { ProductShowcase } from '@/components/mockups'
import { formatEUR } from '@/lib/format'
import type { Catalog } from '@/lib/settings-schema'
import { Sparkle, Star } from './Decor'

const POP_SHADOW = '[filter:drop-shadow(5px_6px_0_rgba(27,19,64,1))]'

/** Composición de productos con diseños de ejemplo y pegatinas. Decorativa: los textos están en el hero. */
function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem] lg:max-w-none" aria-hidden="true">
      <div className="bg-dots-soft absolute inset-[3%] rotate-3 rounded-[2.5rem] border-2 border-ink bg-yellow shadow-pop-lg" />
      <div className="absolute left-[5%] top-[6%] h-[34%] w-[34%] -rotate-6 rounded-full border-2 border-ink bg-pink" />
      <div className="absolute bottom-[7%] right-[5%] h-[30%] w-[30%] rotate-12 rounded-[1.6rem] border-2 border-ink bg-teal" />

      <div className={`absolute left-[6%] top-[9%] w-[52%] -rotate-6 ${POP_SHADOW}`}>
        <ProductShowcase productId="camiseta" colorId="blanco" variant={0} label="" className="h-auto w-full" />
      </div>
      <div className={`absolute right-[2%] top-[17%] w-[50%] rotate-[5deg] ${POP_SHADOW}`}>
        <ProductShowcase productId="hoodie" colorId="rosa" variant={1} label="" className="h-auto w-full" />
      </div>
      <div className={`absolute bottom-[8%] left-[4%] w-[40%] -rotate-3 ${POP_SHADOW}`}>
        <ProductShowcase productId="gorra" colorId="marino" variant={3} label="" className="h-auto w-full" />
      </div>
      <div className={`absolute bottom-[4%] right-[10%] w-[31%] rotate-6 ${POP_SHADOW}`}>
        <ProductShowcase productId="taza" variant="icon" art={4} label="" className="h-auto w-full" />
      </div>

      <p className="sticker absolute right-[5%] top-[2%] rotate-6 bg-paper text-sm sm:text-base">Tu diseño aquí</p>
      <p className="sticker absolute bottom-[34%] left-[1%] -rotate-6 bg-teal text-sm sm:text-base">DTF a todo color</p>
      <p className="sticker absolute bottom-[1%] left-[38%] rotate-2 bg-pink text-sm sm:text-base">Desde 1 unidad</p>
      <Star className="absolute left-[44%] top-[0%] h-9 w-9 rotate-12 sm:h-12 sm:w-12" />
      <Sparkle className="absolute right-[1%] bottom-[38%] h-8 w-8 sm:h-10 sm:w-10" fill="#ff4f9a" />
    </div>
  )
}

/** Portada. Descuentos, plazos y envío salen del catálogo efectivo (editable en el panel). */
export function Hero({ catalog }: { catalog: Catalog }) {
  const { production, shipping } = catalog
  const maxDiscount = Math.max(...catalog.quantityDiscounts.map((d) => d.pct))
  const facts = [
    'Sin mínimo de unidades',
    `Producción de ${production.leadDaysMin} a ${production.leadDaysMax} días laborables`,
    `Envío gratis desde ${formatEUR(shipping.freeFromCents, { compact: true })}`,
  ]
  return (
    <section className="bg-dots-soft overflow-hidden border-b-2 border-ink bg-cream" aria-labelledby="hero-titulo">
      <div className="container-pop grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8 lg:py-20">
        <div>
          <p className="sticker bg-pink-soft text-sm sm:text-base">Impresión DTF · Hecho para ti</p>
          <h1 id="hero-titulo" className="mt-5 text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[3.9rem] xl:text-7xl">
            Diseña ropa, gorras y tazas <span className="squiggle-underline">que nadie más tendrá</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
            Sube tu logo o tu foto, añade texto y pegatinas y mira cómo queda antes de pedir. Lo imprimimos con colores vivos y te lo
            enviamos a casa. Y si pides muchas unidades, tienes descuentos de hasta un {maxDiscount}&nbsp;%.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link href="/personalizar" className="btn btn-primary btn-lg">
              <Wand2 aria-hidden="true" size={22} strokeWidth={2.4} />
              Diseña el tuyo
            </Link>
            <Link href="/empresas" className="btn btn-lg">
              <Building2 aria-hidden="true" size={22} strokeWidth={2.4} />
              Pedidos para empresas
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] font-bold">
            {facts.map((fact) => (
              <li key={fact} className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 border-2 border-ink bg-yellow" />
                {fact}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-soft">
            ¿Primera vez?{' '}
            <Link href="/como-funciona" className="inline-flex min-h-11 items-center gap-1 font-bold text-violet-deep underline underline-offset-4">
              Mira cómo funciona <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </p>
        </div>
        <HeroVisual />
      </div>
    </section>
  )
}
