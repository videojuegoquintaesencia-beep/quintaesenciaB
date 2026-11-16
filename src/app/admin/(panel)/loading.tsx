/** Esqueleto mientras carga cualquier pantalla del panel. */
export default function PanelLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-5">
      <span className="sr-only">Cargando…</span>
      <div className="h-10 w-64 rounded-xl bg-ink/10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl border-2 border-ink/10 bg-paper" />
        ))}
      </div>
      <div className="h-72 rounded-2xl border-2 border-ink/10 bg-paper" />
    </div>
  )
}
