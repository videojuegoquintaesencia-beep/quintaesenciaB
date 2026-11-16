import Link from 'next/link'
import { Wand2 } from 'lucide-react'
import { site } from '@/config/site'
import { CartLink } from './CartLink'
import { Logo } from './Logo'
import { MainNav } from './MainNav'
import { MobileMenu } from './MobileMenu'

/** Cabecera fija: logo, navegación, carrito y llamada a la acción. */
export function SiteHeader() {
  return (
    <>
      <a href="#contenido" className="skip-link fixed">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper">
        <div className="container-pop flex h-16 items-center justify-between gap-3 sm:h-[4.5rem]">
          <Link href="/" aria-label={`${site.name}, ir al inicio`} className="rounded-xl">
            <Logo />
          </Link>
          <MainNav />
          <div className="flex items-center gap-2 sm:gap-3">
            <CartLink />
            <Link href="/personalizar" className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Wand2 aria-hidden="true" size={18} strokeWidth={2.4} />
              Personalizar
            </Link>
            <MobileMenu />
          </div>
        </div>
      </header>
    </>
  )
}
