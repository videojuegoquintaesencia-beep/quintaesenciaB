# Pieza Única

Tienda online y personalizador visual de **camisetas, sudaderas, gorras y tazas** con impresión DTF.
El cliente diseña en el navegador (sube su imagen, añade texto y pegatinas), ve el resultado sobre el
producto, recibe el **precio al instante** y paga con **PayPal**. La dueña gestiona los pedidos desde un
**panel de administración** y recibe avisos por email. También hay una vía de **presupuesto para empresas,
equipos y eventos**.

> "Pieza Única" es un nombre de trabajo. No se ha comprobado su disponibilidad como marca ni como dominio.

## Qué incluye

| Área | Rutas | Notas |
| --- | --- | --- |
| Web pública | `/`, `/productos`, `/productos/[slug]`, `/como-funciona`, `/preguntas-frecuentes` | Ilustraciones SVG propias de cada producto, SEO y datos estructurados |
| Personalizador | `/personalizar`, `/personalizar/[producto]` | Editor Konva: imágenes, texto (9 fuentes), 20 pegatinas, capas, deshacer/rehacer, precio en vivo, archivo de impresión PNG transparente a 300 dpi |
| Compra | `/carrito`, `/checkout`, `/pedido/[id]`, `/seguimiento` | Precio recalculado siempre en el servidor, envío, IVA, PayPal, seguimiento por enlace con token |
| Empresas | `/empresas`, `/contacto`, `/presupuesto/[id]` | Formulario de presupuesto con adjuntos, formulario de contacto y página de la propuesta de precio (aceptación y pago online, enlace con token) |
| Legal | `/legal/aviso-legal`, `/legal/privacidad`, `/legal/cookies`, `/legal/condiciones` | Plantillas generales. **Deben revisarlas un profesional** |
| Administración | `/admin` | Resumen, pedidos (filtros, búsqueda, CSV), detalle con descarga de archivos de impresión, cambio de estado con email, hoja de producción imprimible, presupuestos y mensajes, propuesta de precio por presupuesto |

### Presupuestos con propuesta de precio y pago online

El formulario de `/empresas` crea una solicitud (`PR-1001`) que la dueña gestiona en `/admin/presupuestos/[id]`.
Desde ahí cierra el ciclo sin salir de la web:

1. **Propuesta.** En el panel «Propuesta de precio» compone las líneas (producto del catálogo o texto libre,
   descripción, unidades —en total o desglosadas por tallas— y precio unitario en euros con IVA), el coste de envío
   (0 si va incluido), la validez en días (15 por defecto) y un mensaje para el cliente. «Guardar borrador» no avisa a
   nadie; «Enviar al cliente» fija la fecha límite, genera el enlace público y manda el email
   (`src/lib/emails/quote.ts`, `sendQuoteProposal`). Mientras el cliente no acepte, se puede editar y «Reenviar»
   (renueva la validez; el enlace no cambia). El estado del presupuesto pasa a «Presupuesto enviado».
2. **Aceptación.** El cliente abre `/presupuesto/[id]?t=<token>` (sin indexar, sin `Referer`, 404 con token malo),
   ve las líneas, los totales con el IVA incluido y la validez, y rellena los mismos datos y consentimientos que el
   checkout (se reutilizan `CheckoutForm`, `form-state.ts` y `PaymentSection`). Si la propuesta caducó, no hay botón
   de pago y puede «pedir una actualización» por email. `POST /api/quotes/[id]/accept` crea el pedido pendiente de
   pago **con los importes de la propuesta guardada** (nunca del navegador): líneas `kind: "quote"` con descripción y
   precio unitario, sin diseño ni archivos, y `orders.quote_id` apuntando al presupuesto. Es idempotente: una segunda
   aceptación devuelve el mismo pedido, y al volver al enlace con un pedido sin pagar se va directo al pago. Desde ese
   momento la propuesta es inmutable (el panel la muestra en solo lectura); solo si ese pedido se cancela se puede
   retocar y volver a aceptar.
3. **Pago.** La misma mecánica que el checkout (pago demo o PayPal, cuyo pedido se crea en el endpoint de aceptación).
   Al cobrarse (demo, captura o webhook de PayPal, o marcado a mano como pagado) el presupuesto pasa a «Ganado» y
   salen los emails de pedido habituales.
4. **Panel.** El pedido muestra «Procede del presupuesto PR-xxxx» con enlace; sus líneas enseñan la descripción, las
   unidades, el precio acordado y los adjuntos del presupuesto (también en la hoja de producción y en el CSV, como
   «(presupuesto)»). El presupuesto enlaza su «Pedido PU-xxxx» con el estado del pago, y la lista marca «Propuesta
   enviada» o «Propuesta aceptada».

Modelo y validación en `src/lib/proposal.ts` (zod, céntimos enteros, totales calculados en servidor); lógica de
aceptación en `src/lib/quote-accept.ts`; API del panel en `POST /api/admin/quotes/[id]/proposal`
(`{ action: "save" | "send", proposal }`).

### Reglas de negocio (están en `src/config/`)

- Precios en **céntimos de euro, IVA (21 %) incluido**. Precio de una línea = prenda + suplemento de color +
  estampado por zona (escalón según los cm² realmente ocupados) + suplemento de talla; después, descuento por
  cantidad (0 / 5 / 10 / 15 / 20 % a partir de 1 / 5 / 10 / 25 / 50 unidades).
- Envío 4,95 €, gratis desde 60 €, +3 € a Baleares. No se envía a Canarias, Ceuta ni Melilla desde la tienda online
  (códigos postales 35, 38, 51 y 52): para eso, presupuesto.
- Producción de 2 a 4 días laborables antes del envío.
- Productos, colores, tallas, zonas de impresión y tarifas: `src/config/products.ts`.
  Datos del negocio, envío y plazos: `src/config/site.ts`.

## Puesta en marcha

Requisitos: Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local      # opcional en desarrollo
npm run dev                     # http://localhost:3000
```

Sin configurar nada, en desarrollo:

- La base de datos es un archivo SQLite en `data/pieza-unica.db` (se crea sola).
- El panel está en `/admin` con la contraseña de desarrollo **`admin-demo`**.
- Si no hay credenciales de PayPal, el checkout funciona en **modo demostración** (pago simulado, claramente
  señalado como demostración en la web y en los emails).
- Si no hay SMTP, en desarrollo los emails **se imprimen en la consola del servidor**; en producción no se envían ni se registran.

Para ver el panel con datos de ejemplo:

```bash
npm run seed:demo            # crea 6 pedidos, 2 presupuestos y 1 mensaje de demostración
npm run seed:demo -- --force # los borra y los vuelve a crear
```

Otros scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

## Variables de entorno

Todas están documentadas en `.env.example`.

| Variable | Para qué |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública (sin barra final). Se usa en emails, sitemap y metadatos |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | `file:./data/pieza-unica.db` en local; una base [Turso](https://turso.tech) (`libsql://…`) en producción |
| `ADMIN_PASSWORD` | Contraseña del panel (en producción: mínimo 12 caracteres y no trivial; si no, el panel queda desactivado) |
| `SESSION_SECRET` | Firma de la sesión del panel (≥ 32 caracteres: `openssl rand -base64 48`) |
| `PAYPAL_ENV`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` | PayPal (`sandbox` o `live`) |
| `ALLOW_DEMO_PAYMENTS` | `true` permite el pago simulado también en producción. **No activar con clientes reales** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Email saliente y dirección que recibe los avisos de pedidos y presupuestos |
| `TRUSTED_PROXY_HOPS` | Número de proxies propios delante de la app, para detectar la IP real en los límites de peticiones (por defecto 1; 0 = sin proxy). **Defínelo explícitamente en producción**: un valor erróneo permite saltarse los límites por IP |

## Cómo salir a producción

1. **Hosting.** Cualquier plataforma que ejecute Next.js 16 con Node (por ejemplo Vercel). En plataformas sin disco
   persistente usa una base **Turso** en `DATABASE_URL`; los archivos de los clientes (imágenes, previews,
   PNG de impresión) se guardan en la propia base.
2. **Secretos.** Define `ADMIN_PASSWORD` y `SESSION_SECRET` (largos y aleatorios). Con `NODE_ENV=production` la
   contraseña de desarrollo deja de valer.
3. **PayPal.** Crea una app en el [panel de desarrolladores de PayPal](https://developer.paypal.com/dashboard/applications)
   (primero `sandbox`), rellena `NEXT_PUBLIC_PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`. Añade un webhook a
   `https://TU-DOMINIO/api/paypal/webhook` con los eventos de captura de pago y reembolso, y copia su id en
   `PAYPAL_WEBHOOK_ID` (en producción es obligatorio: sin él el webhook se rechaza). Haz un pedido de prueba en
   sandbox antes de pasar a `live`.
4. **Email.** Rellena `SMTP_*`, `MAIL_FROM` (con un dominio verificado, SPF y DKIM) y `ADMIN_NOTIFY_EMAIL`.
5. **Dominio.** Fija `NEXT_PUBLIC_SITE_URL` al dominio definitivo (`https://…`) **antes de compilar**: es obligatorio. Sin él, los enlaces
   de los emails (seguimiento del pedido), el sitemap y las URL canónicas saldrían con `http://localhost:3000`.
6. **Proxy.** Ajusta `TRUSTED_PROXY_HOPS` al número de proxies que tienes delante. Si tu hosting o proxy permite
   limitar el tamaño de las peticiones (`client_max_body_size` en Nginx, límite de cuerpo en Vercel), fíjalo en
   unos 25 MB (los PNG de impresión de fotos grandes pueden llegar a 20 MB): la app ya corta los cuerpos que se
   pasan de tamaño, pero un tope delante la protege mejor. Si usas Vercel, comprueba que su límite de cuerpo
   de las funciones permite subidas de ese tamaño y haz una prueba con una foto grande en tu entorno real.
7. **Arranque.** Al arrancar en producción el servidor escribe en el registro los problemas de configuración que
   detecta (contraseña o secreto débiles, `NEXT_PUBLIC_SITE_URL` sin definir, datos del titular de `src/config/site.ts` que
   siguen siendo de ejemplo, `TRUSTED_PROXY_HOPS` sin definir, SMTP o webhook sin configurar…). Léelo.

Los límites de peticiones de subidas, checkout y formularios viven en memoria de cada instancia; con varias
instancias conviene sustituirlos por un almacén compartido (Redis/Upstash). El límite de intentos de acceso al panel
(5 fallos por IP y 30 en total cada 15 minutos) se guarda en la base de datos y vale para todas las instancias: si
alguien está probando contraseñas, el panel responde «demasiados intentos» a todo el mundo durante 15 minutos.

La app limpia sola, como mucho una vez por hora, los archivos subidos que no llegaron a un pedido (14 días) y los
pedidos que nunca se pagaron, con sus datos y archivos (30 días); los plazos están en `src/config/site.ts`.

## Antes de publicar: lo que tienes que completar o decidir

- [ ] **Datos de contacto** en `src/config/site.ts` (`contact`): email, teléfono, WhatsApp, redes, dirección y horario.
      El email es de ejemplo (`hola@piezaunica.example`, un dominio reservado que no recibe correo). El teléfono, el
      WhatsApp (sin él no aparece el botón flotante) y la dirección están vacíos y, por tanto, ocultos en la web: rellénalos
      si quieres mostrarlos.
- [ ] **Datos del titular** (`business`): razón social o nombre y apellidos, NIF/CIF, domicilio fiscal y, si procede,
      datos registrales (obligatorios si el titular es una sociedad: p. ej. «Registro Mercantil de Madrid, Tomo X, Folio Y,
      Hoja Z»), y los proveedores de alojamiento, base de datos y correo con el país donde almacenan los datos (`processors`,
      para la política de privacidad). Aparecen resaltados en las páginas legales mientras sigan siendo `[COMPLETAR…]`, y
      el arranque en producción lo registra como error.
- [ ] **Textos legales**: están redactados como plantillas generales para una tienda española. Que los revise un
      profesional, junto con las promesas operativas que contienen (cancelación antes de producción, reimpresión o
      reembolso en caso de defecto, hojas de reclamaciones, plazos de conservación de datos).
- [ ] **Precios, colores, tallas y zonas de impresión reales** en `src/config/products.ts`, y los plazos y tarifas
      de envío en `src/config/site.ts`. Los importes actuales son una propuesta.
- [ ] **Fotos reales** de producto: la web usa ilustraciones SVG. Convendría añadir imágenes reales en las fichas
      (y una imagen para compartir en redes).
- [ ] **Nombre y dominio**: comprueba la disponibilidad de "Pieza Única" como marca (OEPM) y como dominio, o cámbialo
      en `src/config/site.ts` y en el componente `Logo`.
- [ ] **PayPal y SMTP** reales, y una prueba completa en sandbox.
- [ ] **Facturas**: el checkout exige empresa y NIF/CIF a quien marca «Compro como empresa o autónomo», y los emails y las
      condiciones dicen que se envía la factura por email. Decide cómo y cuándo las emites (y si necesitas pedir un domicilio
      fiscal distinto del de envío: ahora se indica en la nota del pedido).
- [ ] **Información al cliente que solo tú puedes confirmar**: cómo se estampan las tazas (la web explica el DTF sobre prenda) y
      si son aptas para lavavajillas y microondas (ahora dice que no), el plazo de entrega a Baleares (la web dice «mensajería
      24-48 h» para todos los envíos), si estás adherida a algún sistema de arbitraje de consumo (ahora dice que no), el formato
      de hojas de reclamaciones obligatorio en tu comunidad autónoma, el plazo máximo de reembolso (14 días naturales) y la URL
      vigente de la política de cookies de PayPal.
- [ ] **Reembolsos**: el panel registra un reembolso, pero el dinero se devuelve desde PayPal.

## Estructura

```
src/
  app/
    (site)/      web pública, carrito, checkout, pedido, contenido y legales
    (studio)/    personalizador (pantalla completa, sin pie de página)
    admin/       panel de administración ((auth) = login, (panel) = protegido)
    api/         checkout, PayPal, subidas, archivos, presupuestos, contacto, admin
  components/    ui, mockups (ilustraciones SVG), editor, cart, checkout, admin, catalog, home, content, site
  config/        site.ts (negocio) y products.ts (catálogo, zonas y tarifas)
  lib/           pricing, design, pedidos, base de datos, auth, emails, PayPal, límites de peticiones…
  proxy.ts       protege /admin y /api/admin (en Next.js 16 sustituye a middleware.ts)
scripts/         seed-demo.mjs (datos de ejemplo para el panel)
```

Decisiones técnicas que conviene conocer:

- El **modelo de diseño** se guarda en centímetros relativos a la zona de impresión (capas de imagen, texto y
  pegatina). El mismo código de precios (`src/lib/pricing.ts`) se usa en el editor y en el servidor, y el servidor
  **vuelve a calcular todo** al crear el pedido: nunca se acepta un importe del cliente.
- El editor genera, al añadir al carrito, una vista previa por vista y un **PNG transparente a 300 ppp por zona** de
  impresión (con la resolución anotada en el propio archivo); el panel permite descargarlos para producción. Si una
  foto grande hace que el PNG pese más de lo que admite la subida (`site.uploads.maxPrintBytes`, 20 MB), el editor
  lo vuelve a dibujar con menos ppp, hasta un mínimo de 150, y el panel muestra los ppp reales de cada archivo.
- Las subidas se validan por su **estructura** (PNG, JPEG y WebP completos y con dimensiones razonables; no por la
  extensión ni el tipo declarado). Los SVG se aceptan solo si pasan una **lista blanca** de elementos y atributos
  (sin scripts, enlaces externos ni `@import`), se sirven siempre como descarga y con cabeceras restrictivas
  (`nosniff`, CSP *sandbox*). Los cuerpos de las peticiones se leen con un tope real de bytes.
- El servidor comprueba que el **PNG de impresión mide lo que se cobra** (la caja envolvente del diseño, a una
  resolución uniforme entre 150 y 300 ppp); si no, rechaza la línea: así no se puede declarar un estampado pequeño
  e imprimir uno grande.
- Cabeceras de seguridad en `next.config.ts`: CSP (con `'unsafe-inline'` en scripts porque las páginas son estáticas
  y no usan *nonce*), HSTS y COOP. Si cambias el SDK de PayPal o añades servicios externos, ajusta la CSP.
- Los pedidos tienen un token público para el enlace de seguimiento (`/pedido/<id>?t=<token>`); la consulta manual
  pide número de pedido y email.
- El panel usa una cookie de sesión firmada (JWT, 12 h, `HttpOnly`, prefijo `__Host-` en producción) y limita los
  intentos de acceso fallidos. Cerrar sesión revoca todas las sesiones abiertas.

## Licencia

Código del proyecto a medida. Las ilustraciones, pegatinas y textos son originales y no dependen de terceros;
las fuentes proceden de `@fontsource` (licencias abiertas SIL OFL).
