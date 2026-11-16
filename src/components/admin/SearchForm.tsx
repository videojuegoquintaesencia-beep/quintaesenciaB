import Link from 'next/link'
import { Search, X } from 'lucide-react'

/** Búsqueda por GET: funciona sin JavaScript y mantiene el resto de filtros como campos ocultos. */
export function SearchForm({
  action,
  value,
  label,
  placeholder,
  hidden,
  clearHref,
}: {
  action: string
  value: string
  label: string
  placeholder: string
  hidden: Record<string, string | undefined>
  clearHref: string
}) {
  return (
    <form action={action} method="get" role="search" className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([name, v]) => (v ? <input key={name} type="hidden" name={name} value={v} /> : null))}
      <div className="relative min-w-0 flex-1 basis-60">
        <label htmlFor="admin-search" className="sr-only">
          {label}
        </label>
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          id="admin-search"
          type="search"
          name="q"
          defaultValue={value}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={100}
          className="input pl-10"
        />
      </div>
      <button type="submit" className="btn btn-secondary">
        Buscar
      </button>
      {value && (
        <Link href={clearHref} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-violet-deep">
          <X size={16} aria-hidden="true" />
          Quitar búsqueda
        </Link>
      )}
    </form>
  )
}
