import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/content/LegalPage'
import { OwnerFacts } from '@/components/content/LegalValue'
import { pageMetadata } from '@/components/content/metadata'
import { siteHost } from '@/components/content/contact-info'
import { site } from '@/config/site'

export const metadata: Metadata = pageMetadata({
  title: 'Aviso legal',
  description: `Datos del titular de ${siteHost}, condiciones de uso del sitio web, propiedad intelectual y ley aplicable.`,
  path: '/legal/aviso-legal',
})

const SECTIONS: LegalSection[] = [
  {
    id: 'titular',
    title: 'Quién es el titular de la web',
    content: (
      <>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio
          electrónico (LSSI-CE), estos son los datos del titular de este sitio web:
        </p>
        <OwnerFacts />
        <p>
          {site.name} es el nombre comercial con el que el titular presta el servicio de venta online de productos personalizados.
        </p>
      </>
    ),
  },
  {
    id: 'objeto',
    title: 'Objeto del sitio web',
    content: (
      <p>
        Este sitio web permite conocer, diseñar y comprar camisetas, sudaderas con capucha, gorras y tazas personalizadas con
        impresión DTF, así como solicitar presupuestos y contactar con nosotros. Las compras se rigen por nuestras{' '}
        <Link href="/legal/condiciones">condiciones de venta</Link>.
      </p>
    ),
  },
  {
    id: 'uso',
    title: 'Condiciones de uso',
    content: (
      <>
        <p>
          Navegar por esta web es gratuito. Al usarla te comprometes a hacerlo de forma lícita, de buena fe y respetando estas
          condiciones. En concreto, te comprometes a no:
        </p>
        <ul>
          <li>Subir o crear diseños ilegales, ofensivos o que vulneren derechos de terceros.</li>
          <li>Introducir datos falsos o suplantar a otra persona al hacer un pedido o enviar un formulario.</li>
          <li>Usar programas automáticos para enviar formularios o extraer contenido de la web.</li>
          <li>Intentar acceder a zonas restringidas, dañar el sitio o interferir en su funcionamiento.</li>
        </ul>
        <p>Podemos rechazar un pedido o bloquear el acceso si detectamos un uso contrario a estas condiciones.</p>
      </>
    ),
  },
  {
    id: 'propiedad',
    title: 'Propiedad intelectual e industrial',
    content: (
      <>
        <p>
          Los textos, imágenes, ilustraciones, simulaciones de producto, logotipos, el diseño de la web y su código pertenecen al titular o se
          utilizan con licencia. No puedes reproducirlos, distribuirlos ni modificarlos sin autorización previa y por escrito,
          salvo lo que permita la ley.
        </p>
        <p>
          Los diseños que subes o creas en el personalizador siguen siendo tuyos (o de quien tenga los derechos sobre ellos).
          Nosotros solo los usamos para fabricar tu pedido. Más detalles en el apartado de propiedad intelectual de las{' '}
          <Link href="/legal/condiciones#propiedad-intelectual">condiciones de venta</Link>.
        </p>
        <p>
          Si crees que algún contenido de esta web vulnera tus derechos, escríbenos y lo revisaremos cuanto antes.
        </p>
      </>
    ),
  },
  {
    id: 'responsabilidad',
    title: 'Responsabilidad',
    content: (
      <>
        <p>
          Hacemos lo posible por que la información de la web sea correcta y esté actualizada, y por que el sitio funcione sin
          interrupciones, pero no podemos garantizar que no haya errores ni cortes puntuales por mantenimiento, fallos técnicos o
          causas ajenas a nosotros.
        </p>
        <p>
          Las simulaciones y las vistas previas son una representación orientativa: el color real puede variar ligeramente según tu
          pantalla y el resultado de la impresión.
        </p>
      </>
    ),
  },
  {
    id: 'enlaces',
    title: 'Enlaces a otras webs',
    content: (
      <p>
        Esta web puede enlazar a sitios de terceros, como PayPal para el pago. No controlamos esos sitios ni somos responsables de
        su contenido o de sus políticas. Puedes enlazar a esta web siempre que no sugieras que tenemos relación con tu sitio, que
        lo respaldamos o que el contenido enlazado es distinto del real.
      </p>
    ),
  },
  {
    id: 'datos-cookies',
    title: 'Protección de datos y cookies',
    content: (
      <p>
        Cómo tratamos tus datos personales lo explicamos en la <Link href="/legal/privacidad">política de privacidad</Link>, y cómo
        usamos el almacenamiento del navegador, en la <Link href="/legal/cookies">política de cookies</Link>.
      </p>
    ),
  },
  {
    id: 'ley',
    title: 'Legislación aplicable y jurisdicción',
    content: (
      <>
        <p>Este aviso legal se rige por la legislación española.</p>
        <p>
          Si eres consumidor, para cualquier conflicto serán competentes los juzgados y tribunales de tu domicilio. En los demás
          casos, los del domicilio del titular indicado en el apartado 1, salvo que la ley establezca otra cosa.
        </p>
      </>
    ),
  },
  {
    id: 'reclamaciones',
    title: 'Hojas de reclamaciones',
    content: (
      <p>
        Tenemos a tu disposición hojas oficiales de reclamaciones. Puedes pedírnoslas escribiendo a{' '}
        {site.contact.email ? <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> : 'nuestro correo de contacto'} y
        también puedes dirigirte a los servicios de consumo de tu comunidad autónoma.
      </p>
    ),
  },
]

export default function AvisoLegalPage() {
  return (
    <LegalPage
      title="Aviso legal"
      intro="Quién está detrás de esta web, cómo puedes usarla y qué ley se aplica."
      sections={SECTIONS}
    />
  )
}
