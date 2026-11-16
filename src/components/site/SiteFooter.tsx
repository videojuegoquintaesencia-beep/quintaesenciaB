import Link from 'next/link'
import { Clock, Lock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { PRODUCTS, QUANTITY_DISCOUNTS } from '@/config/products'
import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'
import { contactLinks, whatsappUrl } from './contact-links'
import { Logo } from './Logo'
import { WhatsAppButton } from './WhatsAppButton'

const firstDiscount = QUANTITY_DISCOUNTS.find((d) => d.pct > 0)

const COLUMNS: { title: string; links: { href: string; label: string }[]; note?: string }[] = [
  {
    title: 'Tienda',
    links: [
      ...PRODUCTS.map((p) => ({ href: `/productos/${p.slug}`, label: p.namePlural })),
      { href: '/personalizar', label: 'Diseña el tuyo' },
    ],
  },
  {
    title: 'Ayuda',
    links: [
      { href: '/como-funciona', label: 'Cómo funciona' },
      { href: '/preguntas-frecuentes', label: 'Preguntas frecuentes' },
      { href: '/seguimiento', label: 'Seguimiento de pedido' },
      { href: '/contacto', label: 'Contacto' },
    ],
  },
  {
    title: 'Empresas',
    note: firstDiscount
      ? `Equipos, empresas y eventos: descuentos por volumen desde ${firstDiscount.minQty} unidades.`
      : 'Equipos, empresas y eventos.',
    links: [{ href: '/empresas', label: 'Pedir presupuesto' }],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/aviso-legal', label: 'Aviso legal' },
      { href: '/legal/privacidad', label: 'Privacidad' },
      { href: '/legal/cookies', label: 'Cookies' },
      { href: '/legal/condiciones', label: 'Condiciones de compra' },
    ],
  },
]

const linkClass =
  'inline-flex min-h-8 items-center rounded-md text-cream/85 underline-offset-4 hover:text-yellow hover:underline focus-visible:outline-yellow'

export function SiteFooter() {
  const { contact, shipping } = site
  const links = contactLinks().filter((l) => l.key === 'email' || l.key === 'phone' || l.key === 'whatsapp')
  const social = contactLinks().filter((l) => l.key === 'instagram' || l.key === 'tiktok')

  return (
    <footer className="bg-ink text-cream">
      <div aria-hidden="true" className="flex h-3 border-t-2 border-ink">
        {['bg-pink', 'bg-yellow', 'bg-teal', 'bg-violet', 'bg-orange'].map((color) => (
          <span key={color} className={`${color} flex-1`} />
        ))}
      </div>

      <div className="container-pop pb-28 pt-12 sm:pb-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
          <div>
            <Link href="/" aria-label={`${site.name}, ir al inicio`} className="inline-block rounded-xl focus-visible:outline-yellow">
              <Logo tone="light" size="lg" />
            </Link>
            <p className="mt-4 max-w-sm text-cream/85">
              Camisetas, sudaderas, gorras y tazas con tu diseño, impresos en DTF con colores vivos. Para ti, para regalar y para tu
              equipo o negocio.
            </p>

            <ul className="mt-6 grid gap-2.5 text-cream/90">
              {links.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="inline-flex min-h-8 items-center gap-2.5 rounded-md font-bold underline-offset-4 hover:text-yellow hover:underline focus-visible:outline-yellow"
                  >
                    {link.key === 'email' && <Mail aria-hidden="true" size={18} />}
                    {link.key === 'phone' && <Phone aria-hidden="true" size={18} />}
                    {link.key === 'whatsapp' && <MessageCircle aria-hidden="true" size={18} />}
                    {link.text}
                    {link.external && <span className="sr-only"> (se abre en una pestaña nueva)</span>}
                  </a>
                </li>
              ))}
              {contact.hours && (
                <li className="flex items-start gap-2.5">
                  <Clock aria-hidden="true" size={18} className="mt-1 shrink-0" />
                  <span>{contact.hours}</span>
                </li>
              )}
              {contact.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin aria-hidden="true" size={18} className="mt-1 shrink-0" />
                  <span>{contact.address}</span>
                </li>
              )}
              {social.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 items-center rounded-md font-bold underline-offset-4 hover:text-yellow hover:underline focus-visible:outline-yellow"
                  >
                    {link.text}
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="font-display text-lg font-semibold text-yellow">{col.title}</h2>
                {col.note && <p className="mt-3 text-sm text-cream/75">{col.note}</p>}
                <ul className="mt-3 grid gap-1">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t-2 border-dashed border-cream/25 pt-6 text-sm text-cream/80 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2 font-bold text-cream">
            <Lock aria-hidden="true" size={16} />
            Pago seguro con PayPal
          </p>
          <p>
            Precios con IVA incluido. Envío gratis desde {formatEUR(shipping.freeFromCents, { compact: true })} a toda España
            (salvo {shipping.excludedZonesLabel}).
          </p>
        </div>
        <p className="mt-4 text-sm text-cream/70">
          © {new Date().getFullYear()} {site.name}. Todos los derechos reservados.
        </p>
      </div>

      {contact.whatsapp && <WhatsAppButton href={whatsappUrl()} />}
    </footer>
  )
}
