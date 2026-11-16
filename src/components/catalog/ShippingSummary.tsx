import Link from 'next/link'
import { CreditCard, Factory, Truck } from 'lucide-react'
import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'

/** Plazos y envío, siempre con los datos de `site`. */
export function ShippingSummary() {
  const { production, shipping } = site
  const items = [
    {
      icon: Factory,
      title: 'Producción',
      tone: 'bg-pink-soft',
      text: `Producimos tu pedido en unos ${production.leadDaysMin}–${production.leadDaysMax} días laborables antes de enviarlo (plazo orientativo). Revisamos tu diseño, lo imprimimos y lo fijamos con calor.`,
    },
    {
      icon: Truck,
      title: 'Envío',
      tone: 'bg-yellow-soft',
      text: `Por ${shipping.carrierLabel}: ${formatEUR(shipping.flatCents)}, y gratis desde ${formatEUR(shipping.freeFromCents, { compact: true })}. A Baleares se suman ${formatEUR(shipping.balearesExtraCents)}. No enviamos a ${shipping.excludedZonesLabel} desde la tienda online.`,
    },
    {
      icon: CreditCard,
      title: 'Pago',
      tone: 'bg-teal-soft',
      text: 'Pago seguro con PayPal. Todos los precios incluyen el IVA.',
    },
  ]
  return (
    <div>
      <ul className="grid gap-5 md:grid-cols-3">
        {items.map((item) => (
          <li key={item.title} className={`card-flat p-5 ${item.tone}`}>
            <item.icon aria-hidden="true" size={30} strokeWidth={2.1} />
            <h3 className="mt-3 text-xl">{item.title}</h3>
            <p className="mt-1 text-ink-soft">{item.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-ink-soft">
        ¿Tienes prisa o es un pedido grande? Escríbenos desde{' '}
        <Link href="/contacto" className="font-bold text-violet-deep underline underline-offset-4">
          contacto
        </Link>{' '}
        y lo miramos juntos.
      </p>
    </div>
  )
}
