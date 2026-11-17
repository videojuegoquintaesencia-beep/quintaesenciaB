import Link from 'next/link'
import { ExternalLink, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { site } from '@/config/site'
import { AdminNav } from './AdminNav'

function LogoutForm({ className, children }: { className: string; children: ReactNode }) {
  return (
    <form method="post" action="/api/admin/logout">
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  )
}

function Brand() {
  return (
    <Link href="/admin" className="inline-flex flex-col leading-none no-underline">
      <span className="font-display text-xl font-semibold">{site.name}</span>
      <span className="mt-1 text-xs font-extrabold uppercase tracking-wider text-ink-soft">Panel de gestión</span>
    </Link>
  )
}

/**
 * Marco del panel: barra lateral en escritorio; barra superior y pestañas inferiores en móvil.
 * Todo el marco se oculta al imprimir (la hoja de producción solo imprime su contenido).
 */
export function AdminShell({ newQuotes, children }: { newQuotes: number; children: ReactNode }) {
  const linkClass =
    'flex min-h-11 w-full items-center gap-2.5 rounded-xl border-2 border-transparent px-3 text-left font-bold text-ink no-underline hover:bg-cream'

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] print:block print:min-h-0">
      <a href="#contenido" className="skip-link print:hidden">
        Saltar al contenido
      </a>

      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto border-r-2 border-ink bg-paper p-4 lg:flex print:hidden">
        <div className="px-1 pt-1">
          <Brand />
        </div>
        <nav aria-label="Principal" className="flex-1">
          <AdminNav variant="side" newQuotes={newQuotes} />
        </nav>
        <div className="flex flex-col gap-1 border-t-2 border-ink/15 pt-3">
          <a href="/" target="_blank" rel="noopener" className={linkClass}>
            <ExternalLink size={18} aria-hidden="true" />
            Ver la tienda
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
          <LogoutForm className={`${linkClass} cursor-pointer`}>
            <LogOut size={18} aria-hidden="true" />
            Cerrar sesión
          </LogoutForm>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Móvil: barra superior */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b-2 border-ink bg-paper px-4 lg:hidden print:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="grid size-11 place-items-center rounded-xl border-2 border-transparent hover:bg-cream"
              aria-label="Ver la tienda (se abre en una pestaña nueva)"
            >
              <ExternalLink size={20} aria-hidden="true" />
            </a>
            <LogoutForm className="grid size-11 cursor-pointer place-items-center rounded-xl border-2 border-transparent hover:bg-cream">
              <LogOut size={20} aria-hidden="true" />
              <span className="sr-only">Cerrar sesión</span>
            </LogoutForm>
          </div>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-8 print:max-w-none print:p-0"
        >
          {children}
        </main>
      </div>

      {/* Móvil: pestañas inferiores */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
      >
        <AdminNav variant="bottom" newQuotes={newQuotes} />
      </nav>
    </div>
  )
}
