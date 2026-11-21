import Link from 'next/link'
import { ProductCard } from '@/components/catalog/ProductCard'
import { getCatalog } from '@/lib/settings'

export default async function ProductNotFound() {
  // Las tarjetas enseñan el precio "desde" efectivo (editable en el panel).
  const { products } = await getCatalog()
  return (
    <div className="container-pop py-14 sm:py-20">
      <div className="max-w-2xl">
        <p className="sticker bg-pink-soft">Producto no encontrado</p>
        <h1 className="mt-5 text-4xl sm:text-6xl">Ese producto no existe (todavía)</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Puede que el enlace esté mal escrito o que el producto ya no esté en el catálogo. Echa un vistazo a lo que sí podemos
          personalizar.
        </p>
        <Link href="/productos" className="btn btn-primary btn-lg mt-7">
          Ver todos los productos
        </Link>
      </div>
      <h2 className="mt-14 text-2xl sm:text-3xl">Lo que sí puedes personalizar</h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </div>
  )
}
