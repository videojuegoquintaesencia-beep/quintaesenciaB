import type { ReactNode } from 'react'

/** Estado vacío amable: una pista de qué ocurre y, si procede, qué hacer. */
export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-paper px-5 py-10 text-center">
      {icon && (
        <div
          aria-hidden="true"
          className="mx-auto mb-3 grid size-12 place-items-center rounded-full border-2 border-ink bg-yellow-soft"
        >
          {icon}
        </div>
      )}
      <p className="font-display text-xl">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-ink-soft">{children}</div>}
    </div>
  )
}
