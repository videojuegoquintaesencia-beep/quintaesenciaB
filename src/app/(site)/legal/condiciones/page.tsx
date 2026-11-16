import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/content/LegalPage'
import { pageMetadata } from '@/components/content/metadata'
import { site } from '@/config/site'
import { formatEUR } from '@/lib/format'

export const metadata: Metadata = pageMetadata({
  title: 'Condiciones de venta',
  description:
    'Condiciones de compra de productos personalizados: pedidos, precios con IVA, pago con PayPal, plazos y envíos, desistimiento, garantía legal de 3 años y derechos sobre tu diseño.',
  path: '/legal/condiciones',
})

const { shipping, production } = site
const vatPct = Math.round(site.vatRate * 100)
const email = site.contact.email
const mail = email ? <a href={`mailto:${email}`}>{email}</a> : 'nuestro correo de contacto'

const SECTIONS: LegalSection[] = [
  {
    id: 'quienes-somos',
    title: 'Quién vende y a quién se aplican estas condiciones',
    content: (
      <>
        <p>
          Estas condiciones regulan las compras que haces en esta web a su titular, cuyos datos de identificación están en el{' '}
          <Link href="/legal/aviso-legal">aviso legal</Link>. Se aplican a consumidores y a empresas o profesionales; cuando un derecho
          es solo para consumidores, lo indicamos.
        </p>
        <p>
          Al hacer un pedido confirmas que has leído estas condiciones y que las aceptas. Te recomendamos guardarlas o imprimirlas.
        </p>
      </>
    ),
  },
  {
    id: 'productos',
    title: 'Productos personalizados',
    content: (
      <>
        <p>
          Vendemos camisetas, sudaderas con capucha, gorras y tazas con tu diseño impreso mediante DTF (Direct-To-Film). Cada
          producto se fabrica después de tu pedido, con tu diseño, el color y las tallas que has elegido.
        </p>
        <p>
          Las imágenes y las vistas previas de la web y del personalizador son orientativas. Pueden existir pequeñas diferencias de
          color por la pantalla desde la que las ves, y ligeras variaciones de posición o de tono propias de cualquier impresión.
        </p>
      </>
    ),
  },
  {
    id: 'pedido',
    title: 'Cómo se hace un pedido y cuándo se acepta',
    content: (
      <>
        <ol>
          <li>Eliges producto, color, diseño, tallas y cantidades, y los añades al carrito.</li>
          <li>Revisas el resumen: productos, descuentos, envío según tu código postal, IVA y total. Puedes cambiar lo que quieras antes de pagar.</li>
          <li>Indicas tus datos y la dirección de entrega.</li>
          <li>Pagas con PayPal.</li>
          <li>Recibes un email de confirmación con tu número de pedido.</li>
        </ol>
        <p>
          El contrato de compraventa se formaliza cuando te enviamos ese email de confirmación. El contrato se celebra en español y
          queda archivado en nuestro sistema: puedes consultar tu pedido en cualquier momento con el enlace del email o desde{' '}
          <Link href="/seguimiento">seguimiento de pedido</Link>.
        </p>
        <p>
          Podemos no aceptar o cancelar un pedido, reembolsándote el importe íntegro, si hay un error evidente de precio, si no podemos
          enviar a tu dirección o si el diseño no se puede imprimir (ver apartado 8).
        </p>
      </>
    ),
  },
  {
    id: 'precios',
    title: 'Precios, IVA y descuentos',
    content: (
      <>
        <p>
          Todos los precios están en euros e incluyen el {vatPct} % de IVA. El coste de envío se te muestra antes de pagar, también con
          IVA incluido.
        </p>
        <p>
          El precio de un producto personalizado depende del producto, el color, la talla, el tamaño del estampado y las zonas que
          imprimas. Aplicamos un descuento por volumen automático a cada línea del pedido según sus unidades (puedes ver los tramos
          en la página de <Link href="/empresas#precios-por-volumen">empresas</Link>).
        </p>
        <p>
          Podemos modificar los precios en cualquier momento, pero el importe que ves en el resumen antes de pagar es el que se aplica a
          tu pedido.
        </p>
      </>
    ),
  },
  {
    id: 'pago',
    title: 'Pago',
    content: (
      <>
        <p>
          El pago se realiza a través de PayPal y se cobra cuando lo confirmas. Hasta entonces no empezamos a producir el pedido. No
          tenemos acceso a los datos de tu tarjeta ni de tu cuenta de PayPal.
        </p>
        <p>
          Si compras como empresa o autónomo, indica el nombre de la empresa y el NIF/CIF al hacer el pedido para que podamos emitir la
          factura con tus datos. Si no lo hiciste, escríbenos con tu número de pedido.
        </p>
        <p>Si te corresponde un reembolso, lo hacemos por el mismo medio de pago que usaste.</p>
      </>
    ),
  },
  {
    id: 'plazos-envio',
    title: 'Plazos, envío y entrega',
    content: (
      <>
        <p>
          <strong>Producción:</strong> {production.leadDaysMin} a {production.leadDaysMax} días laborables desde que recibimos el pago y
          damos por bueno tu archivo. Es un plazo orientativo para pedidos habituales: en pedidos grandes o con una fecha concreta te
          indicaremos el plazo antes de producirlos.
        </p>
        <p>
          <strong>Envío:</strong> por {shipping.carrierLabel} a la dirección que indiques.
        </p>
        <ul>
          <li>Coste de envío: {formatEUR(shipping.flatCents)} en la España peninsular.</li>
          <li>Envío gratis en pedidos de {formatEUR(shipping.freeFromCents, { compact: true })} o más (importe de los productos, descuentos incluidos).</li>
          <li>Baleares: suplemento de {formatEUR(shipping.balearesExtraCents)} cuando el envío no es gratuito.</li>
          <li>
            Desde la tienda online no enviamos todavía a {shipping.excludedZonesLabel} ni fuera de España:{' '}
            <Link href="/contacto">escríbenos</Link> y lo vemos.
          </li>
        </ul>
        <p>
          Si no te entregamos el pedido en el plazo acordado o, si no se acordó ninguno, en 30 días naturales desde la celebración del
          contrato, y eres consumidor, puedes exigirnos que lo entreguemos en un plazo adicional adecuado a las circunstancias. Si no
          cumplimos, podrás resolver el contrato y recuperar lo pagado (art. 66 bis del texto refundido de la Ley General para la
          Defensa de los Consumidores y Usuarios).
        </p>
        <p>
          Revisa el paquete al recibirlo. Si llega dañado o con algún error, avísanos cuanto antes con tu número de pedido y unas fotos.
        </p>
      </>
    ),
  },
  {
    id: 'propiedad-intelectual',
    title: 'Tu diseño y los derechos de uso',
    content: (
      <>
        <p>
          Al subir un archivo o crear un diseño en el personalizador, declaras y garantizas que eres titular de los derechos sobre todo
          su contenido (imágenes, textos, logotipos, marcas, fotografías de personas…) o que tienes permiso para usarlo y para que
          lo reproduzcamos sobre el producto.
        </p>
        <p>
          Nos concedes una licencia limitada, no exclusiva y gratuita para reproducir tu diseño con el único fin de fabricar tu pedido
          y conservar una copia para posibles reimpresiones o reclamaciones. No lo usaremos con otros fines, como publicidad, sin tu
          permiso. El diseño sigue siendo tuyo.
        </p>
        <p>
          Eres responsable del contenido que nos envías y de las reclamaciones de terceros que pudieran derivarse de su uso.
        </p>
      </>
    ),
  },
  {
    id: 'revision',
    title: 'Revisión de archivos y diseños que no imprimimos',
    content: (
      <>
        <p>
          Antes de producir revisamos tu archivo (resolución, fondo, colocación). Si vemos algo que pueda afectar al resultado, te
          escribimos para que lo corrijas o lo apruebes tal como está. Esta revisión es técnica: no implica que verifiquemos tus
          derechos sobre el diseño.
        </p>
        <p>Nos reservamos el derecho a rechazar diseños que:</p>
        <ul>
          <li>Sean ilegales o inciten al odio, la violencia o la discriminación.</li>
          <li>Contengan contenido sexual explícito o pongan en riesgo a menores.</li>
          <li>Infrinjan marcas, derechos de autor u otros derechos de terceros, o vulneren su imagen, honor o intimidad.</li>
          <li>Sean ofensivos o inadecuados a criterio razonable del taller.</li>
        </ul>
        <p>
          Si rechazamos un diseño después del pago, te lo comunicaremos y te reembolsaremos el importe íntegro del pedido o de la parte
          afectada.
        </p>
      </>
    ),
  },
  {
    id: 'desistimiento',
    title: 'Derecho de desistimiento',
    content: (
      <>
        <p>
          <strong>
            El derecho de desistimiento de 14 días no se aplica a los productos que vendemos en esta web.
          </strong>{' '}
          Según el artículo 103.c del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios, está excluido
          el suministro de bienes confeccionados conforme a las especificaciones del consumidor o claramente personalizados. Todos
          nuestros productos se fabrican con tu diseño, así que no pueden devolverse por desistimiento.
        </p>
        <p>
          Esto no afecta a tu garantía legal: si el producto tiene un defecto o no es lo que pediste, tienes los derechos que explicamos
          en el apartado siguiente.
        </p>
      </>
    ),
  },
  {
    id: 'garantia',
    title: 'Garantía legal y errores de impresión',
    content: (
      <>
        <p>
          Si compras como consumidor, tienes una garantía legal de <strong>3 años desde la entrega</strong> por falta de conformidad
          del producto. Si el producto no es conforme, tienes derecho a que lo reparemos o lo sustituyamos sin coste (incluido el envío) y, si no es posible o no
          lo hacemos en un plazo razonable, a una rebaja del precio o a resolver el contrato y recuperar lo pagado.
        </p>
        <p>
          <strong>Errores de impresión imputables a la tienda</strong> (estampado distinto del que aprobaste, colores o posición
          claramente alejados del diseño, defectos de transferencia, prenda dañada o distinta de la pedida): reimprimimos tu pedido
          sin coste o, si prefieres o no es posible, te reembolsamos el importe afectado.
        </p>
        <p>No se consideran defectos:</p>
        <ul>
          <li>El desgaste normal por el uso o por lavar y planchar de forma distinta a los cuidados indicados para cada producto.</li>
          <li>Los resultados derivados del archivo que subiste cuando te habíamos avisado del problema y decidiste continuar (baja resolución, fondos, colores que no se reproducen con tinta).</li>
          <li>Los daños por golpes, mal uso o manipulación posterior.</li>
        </ul>
        <p>
          Para reclamar, escríbenos a {mail} con tu número de pedido y fotos del problema. Si compras como empresa o profesional, avísanos
          de cualquier defecto en cuanto lo detectes y, si el error es nuestro, lo reimprimimos o te reembolsamos.
        </p>
      </>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios y cancelaciones',
    content: (
      <p>
        Puedes pedirnos cambiar o cancelar un pedido escribiéndonos cuanto antes con tu número de pedido. Si todavía no hemos empezado a
        producirlo, lo cambiamos o lo cancelamos y te reembolsamos. Una vez impreso el estampado no es posible, porque el producto
        se fabrica a medida.
      </p>
    ),
  },
  {
    id: 'responsabilidad',
    title: 'Limitación de responsabilidad',
    content: (
      <>
        <p>
          No respondemos de los daños indirectos ni del lucro cesante derivados del uso de los productos o de retrasos en la entrega,
          salvo que la ley lo establezca. Si compras como empresa o profesional, nuestra responsabilidad se limita al importe del
          pedido, salvo dolo o negligencia grave.
        </p>
        <p>Nada de lo anterior limita los derechos que la ley reconoce a los consumidores y que no pueden renunciarse.</p>
      </>
    ),
  },
  {
    id: 'reclamaciones',
    title: 'Atención al cliente y reclamaciones',
    content: (
      <>
        <p>
          Puedes contactarnos en {mail} o desde la página de <Link href="/contacto">contacto</Link>. Tenemos hojas oficiales de
          reclamaciones a tu disposición: pídenoslas por email y te las facilitamos.
        </p>
        <p>
          Si no estás conforme con nuestra respuesta, puedes acudir a los servicios de consumo de tu comunidad autónoma o de tu
          ayuntamiento (OMIC).
        </p>
      </>
    ),
  },
  {
    id: 'ley',
    title: 'Ley aplicable y jurisdicción',
    content: (
      <p>
        Estas condiciones se rigen por la ley española. Si eres consumidor, para cualquier conflicto serán competentes los juzgados y
        tribunales de tu domicilio. Si compras como empresa o profesional, los del domicilio del titular indicado en el{' '}
        <Link href="/legal/aviso-legal">aviso legal</Link>.
      </p>
    ),
  },
  {
    id: 'modificaciones',
    title: 'Modificaciones de estas condiciones',
    content: (
      <p>
        Podemos actualizar estas condiciones. A cada pedido se le aplican las vigentes en el momento de realizarlo. Arriba verás la
        fecha de la última actualización.
      </p>
    ),
  },
]

export default function CondicionesPage() {
  return (
    <LegalPage
      title="Condiciones de venta"
      crumb="Condiciones de venta"
      intro="Cómo funcionan los pedidos de productos personalizados, los pagos, los envíos y tus derechos si algo no sale como esperabas."
      sections={SECTIONS}
    />
  )
}
