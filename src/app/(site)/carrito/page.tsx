import type { Metadata } from 'next'
import { CartView } from '@/components/cart/CartView'

export const metadata: Metadata = {
  title: 'Tu carrito',
  description: 'Revisa tus productos personalizados, ajusta tallas y cantidades y continúa con tu pedido.',
  robots: { index: false, follow: true },
}

export default function CartPage() {
  return (
    <div className="container-pop py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Tu carrito</h1>
      <CartView />
    </div>
  )
}
