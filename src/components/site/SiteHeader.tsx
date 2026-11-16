import Link from 'next/link'
import { site } from '@/config/site'

/** PLACEHOLDER: el agente de "shell" lo sustituye por la cabecera real. */
export function SiteHeader() {
  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="container-pop flex items-center justify-between py-4">
        <Link href="/" className="font-display text-2xl font-bold">{site.name}</Link>
        <nav className="flex gap-4 font-bold">
          <Link href="/productos">Productos</Link>
          <Link href="/empresas">Empresas</Link>
          <Link href="/carrito">Carrito</Link>
        </nav>
      </div>
    </header>
  )
}
