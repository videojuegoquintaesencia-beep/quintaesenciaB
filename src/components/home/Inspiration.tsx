import Link from 'next/link'
import { getColor, getProduct, type ProductId } from '@/config/products'
import { ProductShowcase } from '@/components/mockups'
import { Section, SectionHeading } from '@/components/ui/Section'

interface Idea {
  productId: ProductId
  colorId: string
  art: number
  caption: string
  tone: string
}

const IDEAS: Idea[] = [
  { productId: 'camiseta', colorId: 'crema', art: 0, caption: 'Un sol sonriente para días grises', tone: 'bg-yellow-soft' },
  { productId: 'hoodie', colorId: 'negro', art: 1, caption: 'Insignia con estrellas para el equipo', tone: 'bg-violet-soft' },
  { productId: 'taza', colorId: 'rosa', art: 4, caption: 'Arcoíris para el desayuno', tone: 'bg-pink-soft' },
  { productId: 'camiseta', colorId: 'marino', art: 2, caption: 'Atardecer en el pecho', tone: 'bg-sky-soft' },
  { productId: 'gorra', colorId: 'rosa', art: 3, caption: 'Manchas de color en la visera', tone: 'bg-teal-soft' },
  { productId: 'hoodie', colorId: 'rosa', art: 5, caption: 'Flor grande en la espalda', tone: 'bg-orange-soft' },
]

/** Galería de ejemplos ilustrativos. Cada tarjeta lleva al personalizador con ese producto y color. */
export function Inspiration() {
  return (
    <Section aria-labelledby="ideas-titulo" tone="white" className="border-b-2 border-ink">
      <SectionHeading id="ideas-titulo" eyebrow="Ideas para inspirarte" title="Así podría quedar tu diseño">
        Son ilustraciones de ejemplo, no productos a la venta: tú pones tu logo, tu foto o tu texto. Toca una para empezar con ese
        producto y color.
      </SectionHeading>
      <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {IDEAS.map((idea) => {
          const product = getProduct(idea.productId)
          const color = product && getColor(product, idea.colorId)
          if (!product || !color) return null
          return (
            <li key={`${idea.productId}-${idea.art}`}>
              <Link
                href={`/personalizar/${product.id}?color=${color.id}`}
                className="card card-hover group flex h-full flex-col overflow-hidden"
              >
                <span className={`grid place-items-center border-b-2 border-ink p-4 sm:p-7 ${idea.tone}`}>
                  <ProductShowcase
                    productId={product.id}
                    colorId={color.id}
                    variant="icon"
                    art={idea.art}
                    label=""
                    className="h-36 w-full transition-transform duration-200 group-hover:scale-105 sm:h-52 motion-reduce:transition-none"
                  />
                </span>
                <span className="flex flex-1 flex-col gap-1 p-3.5 sm:p-5">
                  <span className="font-display text-base font-semibold leading-tight sm:text-xl">{idea.caption}</span>
                  <span className="text-sm text-ink-soft">
                    {product.name} {color.name.toLowerCase()}
                  </span>
                  <span className="mt-auto pt-2 text-sm font-bold text-violet-deep underline underline-offset-4 group-hover:text-pink-deep">
                    Hacer el mío
                    <span className="sr-only">: {product.name.toLowerCase()} {color.name.toLowerCase()}</span>
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
