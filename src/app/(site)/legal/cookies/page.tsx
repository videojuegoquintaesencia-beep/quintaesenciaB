import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/content/LegalPage'
import { LegalFacts } from '@/components/content/LegalValue'
import { pageMetadata } from '@/components/content/metadata'
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS } from '@/lib/auth-token'

export const metadata: Metadata = pageMetadata({
  title: 'Política de cookies',
  description:
    'Qué almacenamos en tu navegador (carrito, borrador de diseño y PayPal en el pago), para qué sirve y cómo borrarlo. No usamos cookies de analítica ni de publicidad.',
  path: '/legal/cookies',
})

const adminHours = Math.round(ADMIN_SESSION_SECONDS / 3600)

const ENTRIES: { title: string; rows: { label: string; value: string }[] }[] = [
  {
    title: 'Carrito de la compra',
    rows: [
      { label: 'Nombre', value: 'pieza-unica-cart-v1' },
      { label: 'Tipo', value: 'Almacenamiento local del navegador (localStorage), propio y técnico.' },
      { label: 'Para qué sirve', value: 'Recordar lo que has añadido al carrito, para que no lo pierdas si cierras la pestaña.' },
      { label: 'Duración', value: 'Hasta que vacíes el carrito, hagas el pedido o borres los datos del navegador.' },
    ],
  },
  {
    title: 'Borrador del diseño',
    rows: [
      { label: 'Nombre', value: 'pieza-unica-draft- seguido del producto' },
      { label: 'Tipo', value: 'Almacenamiento local del navegador (localStorage), propio y técnico.' },
      { label: 'Para qué sirve', value: 'Guardar tu diseño en curso en el personalizador, para retomarlo más tarde.' },
      { label: 'Duración', value: 'Hasta que lo descartes o borres los datos del navegador.' },
    ],
  },
  {
    title: 'Sesión del panel de administración',
    rows: [
      { label: 'Nombre', value: ADMIN_COOKIE },
      { label: 'Tipo', value: 'Cookie propia, técnica y de sesión (HttpOnly).' },
      { label: 'Para qué sirve', value: 'Mantener abierta la sesión de las personas que gestionan la tienda. No se instala a quienes visitan la web.' },
      { label: 'Duración', value: `${adminHours} horas como máximo.` },
    ],
  },
  {
    title: 'PayPal (solo al pagar)',
    rows: [
      { label: 'Nombre', value: 'Varios, definidos por PayPal' },
      { label: 'Tipo', value: 'Cookies de tercero, técnicas y de seguridad.' },
      {
        label: 'Para qué sirve',
        value: 'Mostrar los botones de pago, procesar el pago de forma segura y prevenir el fraude. Se cargan cuando llegas a la pantalla de pago.',
      },
      { label: 'Duración', value: 'La que establezca PayPal en su política de cookies.' },
    ],
  },
]

const SECTIONS: LegalSection[] = [
  {
    id: 'que-son',
    title: 'Qué son las cookies y el almacenamiento local',
    content: (
      <p>
        Las cookies son pequeños archivos que una web guarda en tu navegador. El almacenamiento local (<em>localStorage</em>) cumple una
        función parecida: guarda información en tu dispositivo para que la web funcione mejor. Esta política explica qué guardamos y
        para qué, conforme al artículo 22.2 de la LSSI-CE.
      </p>
    ),
  },
  {
    id: 'que-usamos',
    title: 'Qué usamos en esta web',
    content: (
      <>
        <p>Solo usamos almacenamiento técnico, imprescindible para que la web haga lo que le pides:</p>
        {ENTRIES.map((e) => (
          <div key={e.title}>
            <h3>{e.title}</h3>
            <LegalFacts rows={e.rows} />
          </div>
        ))}
      </>
    ),
  },
  {
    id: 'que-no-usamos',
    title: 'Qué no usamos',
    content: (
      <ul>
        <li>Cookies de analítica o medición de visitas.</li>
        <li>Cookies de publicidad, de seguimiento entre webs o de perfiles.</li>
        <li>Botones, vídeos o mapas incrustados de redes sociales.</li>
        <li>Tipografías de servicios externos: las servimos desde nuestro propio dominio.</li>
      </ul>
    ),
  },
  {
    id: 'consentimiento',
    title: 'Por qué no te pedimos consentimiento',
    content: (
      <p>
        La normativa solo exige consentimiento para las cookies que no son estrictamente necesarias. Como todo lo que usamos es técnico
        y necesario para el servicio que solicitas (comprar, diseñar o pagar), no mostramos un banner de cookies. Si en el futuro
        añadiéramos analítica u otras cookies no necesarias, te pediremos antes tu consentimiento y actualizaremos esta página.
      </p>
    ),
  },
  {
    id: 'gestion',
    title: 'Cómo borrarlas o bloquearlas',
    content: (
      <>
        <p>
          Puedes ver, borrar o bloquear cookies y datos de sitios desde los ajustes de tu navegador. Estas son las guías de los más
          habituales:
        </p>
        <ul>
          <li>
            <a href="https://support.google.com/chrome/answer/95647?hl=es" target="_blank" rel="noopener noreferrer">
              Google Chrome<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </li>
          <li>
            <a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">
              Mozilla Firefox<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </li>
          <li>
            <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">
              Safari<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">
              Microsoft Edge<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </li>
        </ul>
        <p>
          Ten en cuenta que, si borras los datos del sitio, perderás el carrito y los diseños en curso que tengas guardados en tu
          navegador. Si bloqueas las cookies de PayPal, es posible que no puedas completar el pago.
        </p>
      </>
    ),
  },
  {
    id: 'mas-informacion',
    title: 'Más información y cambios',
    content: (
      <p>
        Si tienes dudas, escríbenos desde la página de <Link href="/contacto">contacto</Link>. Esta política puede actualizarse si
        cambia lo que usamos; arriba siempre verás la fecha de la última revisión. También te puede interesar la{' '}
        <Link href="/legal/privacidad">política de privacidad</Link>.
      </p>
    ),
  },
]

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de cookies"
      crumb="Cookies"
      intro="Solo guardamos en tu navegador lo imprescindible: tu carrito, tu diseño en curso y, al pagar, lo que necesita PayPal."
      sections={SECTIONS}
    />
  )
}
