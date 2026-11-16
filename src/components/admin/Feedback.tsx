import { CircleCheck, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Mensaje de resultado de un formulario; los errores se anuncian al instante (role=alert). */
export function Feedback({ kind, children, className }: { kind: 'success' | 'error' | 'warning'; children: ReactNode; className?: string }) {
  const Icon = kind === 'success' ? CircleCheck : TriangleAlert
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-xl border-2 border-ink px-3 py-2.5 text-sm font-semibold',
        kind === 'success' && 'bg-success-soft',
        kind === 'error' && 'bg-danger-soft',
        kind === 'warning' && 'bg-yellow-soft',
        className,
      )}
    >
      <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
