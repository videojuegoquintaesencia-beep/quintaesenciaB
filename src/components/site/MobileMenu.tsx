'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Menu, Wand2, X } from 'lucide-react'
import { NAV_EXTRA_LINKS, NAV_LINKS, isActivePath } from './nav'

/**
 * Menú desplegable para móvil y tablet (patrón "disclosure").
 * Se cierra con Escape (devolviendo el foco al botón), al pulsar fuera, al navegar y al pasar a escritorio.
 */
export function MobileMenu() {
  const pathname = usePathname()
  const panelId = useId()
  // Guardamos en qué ruta se abrió: al cambiar de ruta el menú queda cerrado sin necesidad de un efecto.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt !== null && openedAt === pathname
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((returnFocus: boolean) => {
    setOpenedAt(null)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false)
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onResize = () => {
      if (desktop.matches) close(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    desktop.addEventListener('change', onResize)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      desktop.removeEventListener('change', onResize)
    }
  }, [open, close])

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenedAt(open ? null : pathname)}
        className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-paper px-3.5 font-display font-semibold text-ink transition-colors hover:bg-yellow-soft aria-expanded:bg-yellow"
      >
        {open ? <X aria-hidden="true" size={22} strokeWidth={2.5} /> : <Menu aria-hidden="true" size={22} strokeWidth={2.5} />}
        <span className="hidden min-[420px]:inline">Menú</span>
        <span className="sr-only min-[420px]:hidden">Menú</span>
      </button>

      {open && <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 top-16 bg-ink/40 sm:top-[4.5rem]" />}

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b-2 border-ink bg-paper shadow-[0_8px_0_0_rgba(27,19,64,0.18)] sm:max-h-[calc(100dvh-4.5rem)]"
      >
        <nav aria-label="Menú principal" className="container-pop py-4">
          <ul className="grid gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(pathname, link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className="flex min-h-12 items-center rounded-2xl border-2 border-transparent px-4 font-display text-xl font-semibold text-ink hover:bg-yellow-soft aria-[current=page]:border-ink aria-[current=page]:bg-yellow"
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
          <Link href="/personalizar" className="btn btn-primary btn-lg btn-block mt-4">
            <Wand2 aria-hidden="true" size={20} strokeWidth={2.4} />
            Personalizar
          </Link>
          <ul className="mt-4 grid gap-1 border-t-2 border-dashed border-ink/30 pt-3 sm:grid-cols-2">
            {NAV_EXTRA_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActivePath(pathname, link.href) ? 'page' : undefined}
                  className="flex min-h-11 items-center rounded-xl px-4 font-bold text-ink-soft hover:bg-yellow-soft hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
