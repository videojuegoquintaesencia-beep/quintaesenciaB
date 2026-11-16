'use client'
import Link from 'next/link'
import { Wand2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useProductSelection } from './ProductSelection'

/** Botón "Personalizar {producto}" que lleva al editor con el color que se haya elegido. */
export function PersonalizeLink({ className, large = true }: { className?: string; large?: boolean }) {
  const { product, color } = useProductSelection()
  return (
    <Link
      href={`/personalizar/${product.id}?color=${color.id}`}
      className={cn('btn btn-primary', large && 'btn-lg', className)}
    >
      <Wand2 aria-hidden="true" size={22} strokeWidth={2.4} />
      Personalizar {product.name.toLowerCase()}
    </Link>
  )
}
