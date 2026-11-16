import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { StatusTone } from '@/lib/order-status'

const TONES: Record<StatusTone, string> = {
  neutral: 'bg-white text-ink',
  info: 'bg-sky-soft text-ink',
  warning: 'bg-yellow-soft text-ink',
  success: 'bg-success-soft text-ink',
  danger: 'bg-danger-soft text-ink',
}

/** Etiqueta de estado (pedidos, presupuestos…). */
export function Badge({ tone = 'neutral', children, className }: { tone?: StatusTone; children: ReactNode; className?: string }) {
  return <span className={cn('chip', TONES[tone], className)}>{children}</span>
}
