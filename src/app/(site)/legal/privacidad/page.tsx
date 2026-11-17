import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/content/LegalPage'
import { LegalFacts, OwnerFacts } from '@/components/content/LegalValue'
import { pageMetadata } from '@/components/content/metadata'
import { site } from '@/config/site'

export const metadata: Metadata = pageMetadata({
  title: 'Política de privacidad',
  description:
    'Qué datos personales tratamos, para qué, con qué base legal, quién los recibe, cuánto tiempo los conservamos y cómo ejercer tus derechos (RGPD y LOPDGDD).',
  path: '/legal/privacidad',
})

const email = site.contact.email
const mail = email ? <a href={`mailto:${email}`}>{email}</a> : 'nuestro correo de contacto'

const PURPOSES: { title: string; rows: { label: string; value: string }[] }[] = [
  {
    title: 'Gestionar tus pedidos',
    rows: [
      { label: 'Qué hacemos', value: 'Procesar tu pedido, producirlo, enviarlo, avisarte de su estado, atender incidencias y emitir la factura.' },
      { label: 'Base jurídica', value: 'Ejecución del contrato de compraventa (art. 6.1.b RGPD).' },
    ],
  },
  {
    title: 'Atender presupuestos y mensajes',
    rows: [
      { label: 'Qué hacemos', value: 'Responder a tus solicitudes de presupuesto y a los mensajes que nos envías por los formularios, el email, el teléfono o WhatsApp.' },
      {
        label: 'Base jurídica',
        value: 'Aplicación de medidas precontractuales a petición tuya (art. 6.1.b RGPD) y tu consentimiento al enviar el formulario (art. 6.1.a RGPD).',
      },
    ],
  },
  {
    title: 'Cumplir obligaciones legales',
    rows: [
      { label: 'Qué hacemos', value: 'Conservar la facturación y la contabilidad y atender requerimientos de las autoridades.' },
      { label: 'Base jurídica', value: 'Cumplimiento de obligaciones legales (art. 6.1.c RGPD).' },
    ],
  },
  {
    title: 'Mantener la web segura',
    rows: [
      { label: 'Qué hacemos', value: 'Limitar el número de envíos desde una misma conexión para evitar abusos, spam y ataques automatizados.' },
      { label: 'Base jurídica', value: 'Interés legítimo en proteger el servicio (art. 6.1.f RGPD).' },
    ],
  },
]

const SECTIONS: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Quién es el responsable de tus datos',
    content: (
      <>
        <p>
          El responsable del tratamiento de tus datos personales es el titular de {site.name}, cuyos datos son:
        </p>
        <OwnerFacts />
        <p>
          Para cualquier cuestión sobre privacidad puedes escribirnos a {mail}.
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    title: 'Qué datos tratamos',
    content: (
      <>
        <p>Solo pedimos los datos necesarios para cada gestión:</p>
        <ul>
          <li>
            <strong>Si compras:</strong> nombre y apellidos, email, teléfono, dirección de entrega, datos de facturación si compras como
            empresa o autónomo (empresa y NIF/CIF), los diseños y archivos que subes y el contenido de tu pedido.
          </li>
          <li>
            <strong>Si pides un presupuesto o nos escribes:</strong> nombre, empresa (si la indicas), email, teléfono (opcional), tu
            mensaje y los archivos que adjuntes.
          </li>
          <li>
            <strong>Datos técnicos:</strong> tu dirección IP, que usamos de forma temporal para limitar envíos repetidos desde la
            misma conexión.
          </li>
        </ul>
        <p>
          <strong>El pago lo gestiona PayPal.</strong> Nosotros no vemos ni guardamos los datos de tu tarjeta o de tu cuenta de PayPal:
          solo recibimos la confirmación de que el pago se ha realizado.
        </p>
        <p>
          Los datos nos los das tú al hacer un pedido o enviar un formulario. Si nos facilitas datos de otras personas (por ejemplo,
          la dirección de entrega de un regalo), debes tener su permiso o una razón legítima para hacerlo.
        </p>
      </>
    ),
  },
  {
    id: 'finalidades',
    title: 'Para qué los usamos y con qué base legal',
    content: (
      <>
        <p>Tratamos tus datos para estas finalidades:</p>
        {PURPOSES.map((p) => (
          <div key={p.title}>
            <h3>{p.title}</h3>
            <LegalFacts rows={p.rows} />
          </div>
        ))}
        <p>
          No usamos tus datos para enviarte publicidad ni para elaborar perfiles, y no tomamos decisiones automatizadas que te afecten.
          Si algún día enviamos comunicaciones comerciales, te pediremos antes tu consentimiento específico.
        </p>
      </>
    ),
  },
  {
    id: 'destinatarios',
    title: 'Quién más puede recibir tus datos',
    content: (
      <>
        <p>No cedemos tus datos a terceros salvo obligación legal. Para prestarte el servicio contamos con proveedores que los tratan por nuestra cuenta y con las garantías que exige el RGPD:</p>
        <ul>
          <li><strong>PayPal:</strong> procesa el pago de tu pedido.</li>
          <li><strong>Empresas de mensajería:</strong> reciben tu nombre, dirección y teléfono (y email, si el transportista lo pide) para entregarte el pedido.</li>
          <li><strong>Proveedor de alojamiento y base de datos:</strong> almacena la web y la información de pedidos y formularios.</li>
          <li><strong>Proveedor de correo electrónico:</strong> envía las confirmaciones y los avisos de tu pedido o de tu consulta.</li>
          <li><strong>Administraciones públicas y asesoría fiscal y contable:</strong> cuando la ley lo exige o para cumplir nuestras obligaciones tributarias.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'transferencias',
    title: 'Transferencias internacionales',
    content: (
      <p>
        Si algún proveedor trata datos fuera del Espacio Económico Europeo, lo hacemos con las garantías que exige el RGPD, como una
        decisión de adecuación de la Comisión Europea o las cláusulas contractuales tipo. PayPal trata los datos de pago conforme a
        su propia política de privacidad.
      </p>
    ),
  },
  {
    id: 'conservacion',
    title: 'Cuánto tiempo conservamos tus datos',
    content: (
      <ul>
        <li>
          <strong>Pedidos y facturas:</strong> mientras dure la relación y, después, durante los plazos que fijan las normas fiscales y
          mercantiles (con carácter general, hasta seis años).
        </li>
        <li>
          <strong>Presupuestos y mensajes:</strong> el tiempo necesario para atender tu consulta y, después, bloqueados durante los
          plazos de prescripción de posibles responsabilidades.
        </li>
        <li>
          <strong>Pedidos que no llegan a pagarse:</strong> se eliminan, con sus archivos, transcurridos {site.uploads.unpaidOrderRetentionDays}{' '}
          días.
        </li>
        <li>
          <strong>Archivos subidos que no llegan a un pedido o a un presupuesto:</strong> se borran de forma automática transcurridos{' '}
          {site.uploads.orphanRetentionDays} días.
        </li>
        <li>
          <strong>Carrito y borradores de diseño:</strong> se guardan solo en tu navegador, y los controlas tú (consulta la{' '}
          <Link href="/legal/cookies">política de cookies</Link>).
        </li>
      </ul>
    ),
  },
  {
    id: 'derechos',
    title: 'Tus derechos y cómo ejercerlos',
    content: (
      <>
        <p>Puedes ejercer en cualquier momento estos derechos sobre tus datos:</p>
        <ul>
          <li>Acceso: saber qué datos tuyos tratamos.</li>
          <li>Rectificación: corregir datos inexactos.</li>
          <li>Supresión: pedir que los borremos cuando ya no sean necesarios.</li>
          <li>Oposición y limitación del tratamiento en los casos que prevé la ley.</li>
          <li>Portabilidad: recibir tus datos en un formato estructurado.</li>
          <li>Retirar tu consentimiento cuando el tratamiento se base en él, sin que afecte a lo ya realizado.</li>
        </ul>
        <p>
          Escríbenos a {mail} indicando qué derecho quieres ejercer y acreditando tu identidad. Te responderemos en el plazo de un mes
          (art. 12.3 RGPD).
        </p>
        <p>
          Si crees que no hemos tratado tus datos correctamente, puedes presentar una reclamación ante la Agencia Española de
          Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es<span className="sr-only"> (se abre en una pestaña nueva)</span></a>).
        </p>
      </>
    ),
  },
  {
    id: 'seguridad',
    title: 'Seguridad',
    content: (
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: conexión cifrada (HTTPS), acceso restringido al
        panel de gestión y recogida solo de los datos necesarios. Aun así, ningún sistema es infalible: si ocurriera una brecha que
        te afecte, te lo comunicaremos conforme a la ley.
      </p>
    ),
  },
  {
    id: 'menores',
    title: 'Menores de edad',
    content: (
      <p>
        Esta web está dirigida a personas mayores de edad. Los menores de 14 años no pueden facilitarnos datos sin el consentimiento
        de sus padres o tutores, y para comprar es necesario ser mayor de edad o contar con su autorización.
      </p>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios en esta política',
    content: (
      <p>
        Podemos actualizar esta política para reflejar cambios legales o en nuestro servicio. Siempre verás arriba la fecha de la última
        actualización.
      </p>
    ),
  },
]

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      crumb="Privacidad"
      intro="Qué datos tratamos, para qué, quién los recibe y cómo puedes ejercer tus derechos, conforme al RGPD y a la LOPDGDD."
      sections={SECTIONS}
    />
  )
}
