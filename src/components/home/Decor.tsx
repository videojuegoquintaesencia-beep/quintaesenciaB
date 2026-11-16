import { cn } from '@/lib/cn'

/** Estrella de cinco puntas con borde de tinta (adorno). */
export function Star({ className, fill = '#ffc93c' }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={cn('h-10 w-10', className)}>
      <path
        d="M24 4l5.6 13.2 14.4 1.2-10.9 9.4 3.3 14L24 34.6 11.6 41.8l3.3-14L4 18.4l14.4-1.2Z"
        fill={fill}
        stroke="#1b1340"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Destello de cuatro puntas (adorno). */
export function Sparkle({ className, fill = '#12c8b4' }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={cn('h-8 w-8', className)}>
      <path
        d="M24 3c1.6 12.4 8.6 19.4 21 21-12.4 1.6-19.4 8.6-21 21-1.6-12.4-8.6-19.4-21-21C15.4 22.4 22.4 15.4 24 3Z"
        fill={fill}
        stroke="#1b1340"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Línea ondulada (adorno). */
export function Squiggle({ className, color = '#ff4f9a' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 120 16" aria-hidden="true" focusable="false" className={cn('h-4 w-28', className)} fill="none">
      <path
        d="M3 8c8-10 14-10 22 0s14 10 22 0 14-10 22 0 14 10 22 0 14-10 22 0"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}
