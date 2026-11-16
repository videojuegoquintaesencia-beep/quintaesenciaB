import { site } from '@/config/site'
import { cn } from '@/lib/cn'

/**
 * Marca de Pieza Única: una camiseta rosa con una estrella amarilla (la "pieza única") y sombra dura de tinta.
 * Es decorativa (aria-hidden): el nombre accesible lo da el texto que la acompaña.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 3 50 46"
      width={size}
      height={(size * 46) / 50}
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path
        d="M17 7 7 11.5 2.5 22 10 25v16a1 1 0 0 0 1 1h26a1 1 0 0 0 1-1V25l7.5-3L41 11.5 31 7c-1.5 4-12.5 4-14 0Z"
        transform="translate(2.5 2.5)"
        fill="#1b1340"
        stroke="#1b1340"
        strokeWidth="2.4"
      />
      <path
        d="M17 7 7 11.5 2.5 22 10 25v16a1 1 0 0 0 1 1h26a1 1 0 0 0 1-1V25l7.5-3L41 11.5 31 7c-1.5 4-12.5 4-14 0Z"
        fill="#ff4f9a"
        stroke="#1b1340"
        strokeWidth="2.4"
      />
      <path
        d="M24 19.8l2.1 5 5.4.4-4.1 3.5 1.3 5.3-4.7-2.9-4.7 2.9 1.3-5.3-4.1-3.5 5.4-.4Z"
        fill="#ffc93c"
        stroke="#1b1340"
        strokeWidth="2"
      />
    </svg>
  )
}

/** Marca + nombre. `tone="light"` para fondos oscuros. */
export function Logo({
  tone = 'dark',
  size = 'md',
  className,
}: {
  tone?: 'dark' | 'light'
  size?: 'md' | 'lg'
  className?: string
}) {
  const [first, ...rest] = site.name.split(' ')
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size === 'lg' ? 52 : 40} />
      <span
        className={cn(
          'font-display font-bold leading-none tracking-tight',
          size === 'lg' ? 'text-3xl' : 'text-[1.4rem]',
          tone === 'light' ? 'text-cream' : 'text-ink',
        )}
      >
        {first}
        {rest.length > 0 && (
          <>
            {' '}
            <span className={tone === 'light' ? 'text-yellow' : 'text-pink-deep'}>{rest.join(' ')}</span>
          </>
        )}
      </span>
    </span>
  )
}
