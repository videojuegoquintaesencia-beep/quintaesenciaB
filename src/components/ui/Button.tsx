import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'teal' | 'dark' | 'danger' | 'plain'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface Common {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
}

export function buttonClasses({ variant = 'primary', size = 'md', block }: Common = {}, extra?: string) {
  return cn(
    'btn',
    variant === 'primary' && 'btn-primary',
    variant === 'secondary' && 'btn-secondary',
    variant === 'teal' && 'btn-teal',
    variant === 'dark' && 'btn-dark',
    variant === 'danger' && 'btn-danger',
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    block && 'btn-block',
    extra,
  )
}

/** <button> con el estilo "pop". */
export function Button({ variant, size, block, className, type = 'button', ...rest }: Common & ComponentProps<'button'>) {
  return <button type={type} className={buttonClasses({ variant, size, block }, className)} {...rest} />
}

/** Enlace (next/link) con aspecto de botón. */
export function ButtonLink({ variant, size, block, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClasses({ variant, size, block }, className)} {...rest} />
}
