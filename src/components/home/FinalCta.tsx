import Link from 'next/link'
import { MessageCircle, Wand2 } from 'lucide-react'
import { Sparkle, Star } from './Decor'

export function FinalCta() {
  return (
    <section aria-labelledby="cta-titulo" className="bg-dots-soft relative overflow-hidden bg-pink py-16 sm:py-24">
      <Star className="absolute left-[6%] top-[14%] hidden h-14 w-14 -rotate-12 sm:block" />
      <Sparkle className="absolute bottom-[16%] right-[8%] hidden h-12 w-12 sm:block" fill="#ffc93c" />
      <Sparkle className="absolute right-[22%] top-[12%] hidden h-8 w-8 sm:block" fill="#fff8ec" />
      <div className="container-pop relative text-center">
        <h2 id="cta-titulo" className="mx-auto max-w-3xl text-4xl sm:text-6xl">
          Tu idea, hecha pieza única
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg font-bold sm:text-xl">
          Empieza ahora: elige un producto, sube tu diseño y mira cómo queda antes de pedirlo.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <Link href="/personalizar" className="btn btn-dark btn-lg">
            <Wand2 aria-hidden="true" size={22} strokeWidth={2.4} />
            Diseña el tuyo
          </Link>
          <Link href="/contacto" className="btn btn-lg">
            <MessageCircle aria-hidden="true" size={22} strokeWidth={2.4} />
            Prefiero hablar con alguien
          </Link>
        </div>
      </div>
    </section>
  )
}
