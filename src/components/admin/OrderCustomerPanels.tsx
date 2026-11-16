import { Building2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { site } from '@/config/site'
import type { Order } from '@/lib/orders'
import { firstName, mailtoHref, telHref, whatsappHref } from '@/lib/admin/contact'
import { CopyButton } from './CopyButton'
import { Panel } from './Panel'

const contactLink =
  'inline-flex min-h-11 items-center gap-2 [overflow-wrap:anywhere] font-bold text-violet-deep underline-offset-4 hover:underline'

/** Datos de contacto del cliente con enlaces directos para escribirle o llamarle. */
export function CustomerPanel({ order }: { order: Order }) {
  const tel = telHref(order.phone)
  const wa = whatsappHref(
    order.phone,
    `Hola ${firstName(order.customerName)}, te escribimos de ${site.name} sobre tu pedido ${order.number}.`,
  )
  return (
    <Panel title="Cliente" id="cliente" icon={<Building2 size={20} />}>
      <p className="text-lg font-extrabold">{order.customerName}</p>
      {order.company && (
        <p className="text-ink-soft">
          {order.company}
          {order.taxId && <span> · NIF/CIF {order.taxId}</span>}
        </p>
      )}
      {!order.company && order.taxId && <p className="text-ink-soft">NIF/CIF {order.taxId}</p>}
      <ul className="mt-2">
        <li>
          <a
            href={mailtoHref(order.email, { subject: `Tu pedido ${order.number} en ${site.name}` })}
            className={contactLink}
          >
            <Mail size={18} aria-hidden="true" className="shrink-0" />
            {order.email}
          </a>
        </li>
        <li>
          {tel ? (
            <a href={tel} className={contactLink}>
              <Phone size={18} aria-hidden="true" className="shrink-0" />
              {order.phone}
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2">
              <Phone size={18} aria-hidden="true" className="shrink-0" />
              {order.phone}
            </span>
          )}
        </li>
        {wa && (
          <li>
            <a href={wa} target="_blank" rel="noopener noreferrer" className={contactLink}>
              <MessageCircle size={18} aria-hidden="true" className="shrink-0" />
              Escribir por WhatsApp
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </li>
        )}
      </ul>
    </Panel>
  )
}

/** Dirección de envío con botón para copiarla a la web de la mensajería. */
export function ShippingPanel({ order }: { order: Order }) {
  const s = order.shipping
  const lines = [
    s.name,
    s.line1,
    s.line2,
    `${s.postalCode} ${s.city}`,
    s.province,
    order.phone ? `Tel. ${order.phone}` : undefined,
  ].filter((l): l is string => !!l && l.trim() !== '')
  return (
    <Panel title="Dirección de envío" id="envio" icon={<MapPin size={20} />}>
      <address className="not-italic leading-snug">
        {lines.map((line, i) => (
          <span key={i} className={i === 0 ? 'block font-extrabold' : 'block'}>
            {line}
          </span>
        ))}
      </address>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CopyButton text={lines.join('\n')} label="Copiar dirección" />
      </div>
    </Panel>
  )
}
