import Link from 'next/link'
import { PRODUCTS, type Product } from '@/config/products'
import { cn } from '@/lib/cn'
import { CATEGORY_LABELS } from './appearance'

export type Category = Product['category']

/** Categorías que tienen productos, en el orden en que aparecen en el catálogo. */
export const CATEGORIES: Category[] = PRODUCTS.map((p) => p.category).filter((c, i, all) => all.indexOf(c) === i)

export function parseCategory(value: string | string[] | undefined): Category | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return CATEGORIES.find((c) => c === raw)
}

/** Filtro por categoría con enlaces normales (`?categoria=`): funciona sin JavaScript. */
export function CategoryFilter({ active }: { active?: Category }) {
  const items: { href: string; label: string; current: boolean }[] = [
    { href: '/productos', label: 'Todo', current: !active },
    ...CATEGORIES.map((c) => ({ href: `/productos?categoria=${c}`, label: CATEGORY_LABELS[c], current: active === c })),
  ]
  return (
    <nav aria-label="Filtrar productos por categoría">
      <ul className="flex flex-wrap gap-2.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              scroll={false}
              aria-current={item.current ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-display text-lg font-semibold transition-colors',
                item.current ? 'bg-ink text-cream shadow-pop-sm' : 'bg-paper text-ink hover:bg-yellow-soft',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
