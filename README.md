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
| Personalizador | `/personalizar`, `/personalizar/[producto]` | Editor Konva: plantillas por ocasión, imágenes, texto (9 fuentes), 20 pegatinas, capas, deshacer/rehacer, precio en vivo, archivo de impresión PNG transparente a 300 dpi |
| Compra | `/carrito`, `/checkout`, `/pedido/[id]`, `/seguimiento` | Precio recalculado siempre en el servidor, envío, IVA, PayPal, seguimiento por enlace con token |
| Empresas | `/empresas`, `/contacto`, `/presupuesto/[id]` | Formulario de presupuesto con adjuntos, formulario de contacto y página de la propuesta de precio (aceptación y pago online, enlace con token) |
| Legal | `/legal/aviso-legal`, `/legal/privacidad`, `/legal/cookies`, `/legal/condiciones` | Plantillas generales. **Deben revisarlas un profesional** |
| Administración | `/admin` | Resumen, pedidos (filtros, búsqueda, CSV), detalle con descarga de archivos de impresión, cambio de estado con email, hoja de producción imprimible, **facturas numeradas** (emisión, envío por email, rectificativa), enlaces de seguimiento por transportista, presupuestos y mensajes con propuesta de precio y pago online, ajustes del negocio (`/admin/ajustes`) |

### Presupuestos con propuesta de precio y pago online

El formulario de `/empresas` crea una solicitud (`PR-1001`) que la dueña gestiona en `/admin/presupuestos/[id]`.
Desde ahí cierra el ciclo sin salir de la web:

1. **Propuesta.** En el panel «Propuesta de precio» compone las líneas (producto del catálogo o texto libre,
   descripción, unidades —en total o desglosadas por tallas— y precio unitario en euros con IVA), el coste de envío
   (0 si va incluido), la validez en días (15 por defecto) y un mensaje para el cliente. «Guardar borrador» no avisa a
   nadie; «Enviar al cliente» fija la fecha límite, genera el enlace público y manda el email
   (`src/lib/emails/quote.ts`, `sendQuoteProposal`). Mientras el cliente no acepte, se puede editar y «Reenviar»
   (renueva la validez; el enlace no cambia; si solo se guardan los cambios, el enlace ya muestra la versión nueva sin
   avisar por email). La validez termina al final del último día en hora peninsular. El estado del presupuesto pasa a
   «Presupuesto enviado».
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

### Reglas de negocio (valores por defecto en `src/config/`, editables desde el panel)

- Precios en **céntimos de euro, IVA (21 %) incluido**. Precio de una línea = prenda + suplemento de color +
  estampado por zona (escalón según los cm² realmente ocupados) + suplemento de talla; después, descuento por
  cantidad (de serie: 0 / 5 / 10 / 15 / 20 % a partir de 1 / 5 / 10 / 25 / 50 unidades).
- Envío 4,95 €, gratis desde 60 €, +3 € a Baleares. No se envía a Canarias, Ceuta ni Melilla desde la tienda online
  (códigos postales 35, 38, 51 y 52): para eso, presupuesto.
- Producción de 2 a 4 días laborables antes del envío.
- Productos, colores, tallas, zonas de impresión y tarifas: `src/config/products.ts`.
  Datos del negocio, envío y plazos: `src/config/site.ts`. Son los **valores por defecto**: lo que la dueña guarda en
  el panel (`/admin/ajustes`, tabla `settings`) se superpone a ellos sección a sección (ver «Ajustes desde el panel»).

### Precios, envíos y plazos editables desde el panel

La dueña cambia estos valores sin tocar código, en **`/admin/ajustes/precios`** y **`/admin/ajustes/envios`**:

- **Precios** (una sección por producto): precio base, suplementos por talla y por color, escalones del estampado
  por zona («hasta X cm²» → precio; la página muestra la superficie máxima de cada zona y comprueba que los escalones
  vayan de menor a mayor), tope de unidades por diseño y la tabla global de descuentos por volumen. Una vista previa
  enseña el «precio desde» de cada producto mientras se edita.
- **Envíos**: tarifa, importe a partir del cual el envío es gratis, suplemento de Baleares, prefijos de código postal
  a los que no se envía (lista de dos dígitos con el nombre de la provincia), y los textos que cita la web (zonas
  excluidas, transportista, zonas de entrega). Mientras haya prefijos excluidos, el nombre de las zonas excluidas es
  obligatorio: aparece en los mensajes del checkout. Los descuentos admiten decimales y se muestran a la española («7,5 %»).
- **Plazos de producción**: días laborables mínimo y máximo.

Cada sección se guarda completa (`POST /api/admin/settings/<sección>`), se valida con los mismos esquemas zod en el
navegador y en el servidor (`src/lib/settings-schema.ts`) y tiene un botón «Restablecer valores por defecto»
(`DELETE`) con confirmación, que vuelve a los valores en código. Lo guardado vive en la tabla `settings` de la base de
datos (`src/lib/settings.ts`, caché de 30 s por instancia que se invalida al guardar).

Toda la tienda lee **el catálogo efectivo** (`getCatalog()` en el servidor, `useCatalog()` en el navegador desde
`src/components/catalog/CatalogProvider.tsx`, que proveen los layouts de la web y del estudio): editor (precio en
vivo y tope de unidades), carrito, checkout (totales, envío, provincias disponibles y rechazo de códigos postales
excluidos), fichas («desde», tablas de escalones y descuentos, preguntas), portada, cómo funciona, empresas,
contacto, condiciones de venta, preguntas frecuentes, pie, datos estructurados e imágenes para compartir, emails de
pedido y página del pedido. El servidor recalcula cada pedido con ese mismo catálogo (`src/lib/checkout.ts`), así que
los pedidos ya creados conservan los importes con los que se pagaron. Sin nada guardado, los precios son
exactamente los de `src/config/`.

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

Otros scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e` (ver [Pruebas](#pruebas)).

## Pruebas

Dos suites, las dos en CI:

| Suite | Herramienta | Qué cubre | Comando |
| --- | --- | --- | --- |
| Unitarias e integración | [vitest](https://vitest.dev) | La lógica de negocio pura (precios y escalones, envíos, IVA, modelo del diseño, validaciones, SVG y PNG, límites de peticiones, PayPal, CSV, ajustes…) y la base de datos real en memoria (esquema y migraciones, pedidos, pagos, estados, ajustes, presupuestos, archivos, límite de accesos) | `npm test` (`npm run test:watch` en modo vigilancia) |
| Extremo a extremo | [Playwright](https://playwright.dev) | Portada y navegación, catálogo y fichas, editor (precio en vivo, archivos generados), carrito, checkout con pago de demostración, seguimiento, panel (acceso, lista, detalle, estados, hoja de producción, CSV), formularios de empresas y contacto y accesibilidad básica; en escritorio (`chromium`, 1280 × 800) y móvil (`movil`, Pixel 7) | `npm run e2e` |

### Unitarias e integración (vitest)

- Archivos en `tests/unit/**` y `tests/integration/**` (también se recogen `src/**/*.test.ts`). Configuración en `vitest.config.ts`: alias `@` → `src`, entorno Node y el paquete `server-only` sustituido por un módulo vacío (`tests/stubs/server-only.ts`) para poder importar `lib/db`, `lib/orders`, etc.
- Las de integración abren libSQL en memoria (`DATABASE_URL=file::memory:`): no tocan `data/` ni necesitan nada arrancado. La prueba de migraciones crea una base con el esquema antiguo en un directorio temporal.
- Un archivo: `npx vitest run tests/unit/pricing.test.ts`. Un caso por nombre: `npx vitest run -t "Baleares"`.

### Extremo a extremo (Playwright)

- `npm run e2e` arranca `next dev` en el puerto **3107** con `NEXT_DIST_DIR=.next-e2e` y `DATABASE_URL=file:./data/e2e.db` (su propia base y su propia compilación: no interfiere con `npm run dev`). Si ya hay un servidor así escuchando en el 3107 lo reutiliza; en CI siempre arranca uno. Al empezar vacía esa base de datos; cada prueba crea después sus propios datos (pedidos por la API con pago de demostración, archivos subidos de verdad) y se presenta al servidor con una IP distinta (`X-Forwarded-For`) para que los límites por IP no acumulen entre pruebas. Las pruebas no dependen del orden.
- Hace falta el navegador: `npx playwright install chromium` (en CI, `--with-deps`).
- Un archivo o un proyecto: `npx playwright test tests/e2e/carrito.spec.ts --project=chromium`. Con el navegador visible: `npm run e2e:headed`. Modo interactivo: `npx playwright test --ui`.
- **Depurar:** `npx playwright test --trace on` guarda una traza por prueba en `test-results/`; se abre con `npx playwright show-trace test-results/<carpeta-de-la-prueba>/trace.zip` y permite ver cada paso, el DOM, la red y la consola. Por defecto las trazas están desactivadas (pesan). Al fallar una prueba siempre se guarda una captura y un resumen (`error-context.md`) en `test-results/`.
- Accesibilidad: se inyecta `node_modules/axe-core/axe.min.js` si existe (axe-core no es dependencia del proyecto); si no está, esas pruebas se omiten y lo dicen.
- Defectos conocidos: una prueba marcada `test.fixme` (Playwright) o `it.todo('[fixme] …')` (vitest) documenta un defecto real pendiente de arreglar; el comentario junto a ella explica cuál.

### Integración continua

`.github/workflows/ci.yml` (Node 22, caché de npm): `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npx playwright install --with-deps chromium`, `npm run e2e` y `npm run build`. Si las pruebas de extremo a extremo fallan, el informe HTML y `test-results/` se suben como artefacto del flujo.

## Ajustes desde el panel

En `/admin/ajustes` la dueña rellena y cambia, sin tocar código, los datos que antes solo vivían en `src/config/site.ts`:

- **Datos del titular** (`/admin/ajustes/negocio`): razón social o nombre y apellidos, NIF/CIF, domicilio fiscal, datos
  registrales (obligatorios si es una sociedad) y proveedores que tratan datos. Cada campo explica para qué sirve (aviso
  legal del art. 10 LSSI-CE, política de privacidad, facturas, información básica del checkout y pie de los emails) y los
  que siguen con un dato de ejemplo (`[COMPLETAR…]`) aparecen marcados en rojo.
- **Contacto y redes** (`/admin/ajustes/contacto`): email de la tienda, teléfono, WhatsApp (solo dígitos con prefijo, sin
  `+`), Instagram y TikTok (usuario o URL), dirección pública y horario. Un campo vacío se oculta en toda la web; sin
  WhatsApp no hay botón flotante; el email es la dirección de respuesta de los emails y, si no hay `ADMIN_NOTIFY_EMAIL`,
  recibe los avisos.
- **Envíos y plazos** y **Precios y descuentos**: se enlazan desde el índice y se documentan en sus propios apartados.

Cómo funciona:

- Cada formulario valida en el navegador con el **mismo esquema zod** que la API (`src/lib/settings-schema.ts`), muestra
  los errores por campo y envía la **sección completa** a `POST /api/admin/settings/[sección]`. «Restablecer valores por
  defecto» (con confirmación) hace `DELETE` y la sección vuelve a los valores del código. El índice muestra cada sección
  como «Personalizada» o «Por defecto» y un aviso destacado mientras queden marcadores `[COMPLETAR…]` o el email `.example`.
- **Toda la app lee los valores efectivos** con `getSettings()` (`src/lib/settings.ts`): páginas legales, contacto,
  empresas, preguntas frecuentes, seguimiento, pie y botón de WhatsApp (desde el layout del sitio), JSON-LD de la portada,
  checkout (información básica de protección de datos), mensajes de error de las API públicas, emails (cuerpo, remite y
  `Reply-To`) y la hoja de producción (remite de la etiqueta). Los componentes de cliente reciben los valores por props
  desde la página de servidor más cercana; los helpers `contactLinks(contact)` y `whatsappHref(whatsapp)` son funciones
  puras de los datos efectivos.
- Las páginas públicas que leen ajustes siguen **prerenderizadas** en el build (con lo que haya en la base de datos en ese
  momento o, si no hay acceso, los valores del código) y se **revalidan** al guardar cualquier sección
  (`revalidatePath('/', 'layout')` en la API). Si en el hosting el build no llega a la base de datos, basta con guardar
  una sección desde el panel tras desplegar para que las páginas se regeneren con los datos reales.
- La comprobación de arranque en producción (`src/instrumentation.ts` → `src/lib/production-checks.ts`) mira los ajustes
  **efectivos**: solo avisa de datos de ejemplo si siguen siéndolo después de aplicar lo guardado en el panel.

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
   detecta (contraseña o secreto débiles, `NEXT_PUBLIC_SITE_URL` sin definir, datos del titular o de contacto que siguen
   siendo de ejemplo tras aplicar lo guardado en el panel, email de contacto vacío sin `ADMIN_NOTIFY_EMAIL` ni `MAIL_FROM`,
   `TRUSTED_PROXY_HOPS` sin definir, SMTP o webhook sin configurar…). Léelo.

Los límites de peticiones de subidas, checkout y formularios viven en memoria de cada instancia; con varias
instancias conviene sustituirlos por un almacén compartido (Redis/Upstash). El límite de intentos de acceso al panel
(5 fallos por IP y 30 en total cada 15 minutos) se guarda en la base de datos y vale para todas las instancias: si
alguien está probando contraseñas, el panel responde «demasiados intentos» a todo el mundo durante 15 minutos.

La app limpia sola, como mucho una vez por hora, los archivos subidos que no llegaron a un pedido (14 días) y los
pedidos que nunca se pagaron, con sus datos y archivos (30 días); los plazos están en `src/config/site.ts`.

## Antes de publicar: lo que tienes que completar o decidir

- [ ] **Datos de contacto**, desde el panel (`/admin/ajustes/contacto`) o en `src/config/site.ts` (`contact`): email,
      teléfono, WhatsApp, redes, dirección y horario. El email por defecto es de ejemplo (`hola@piezaunica.example`, un
      dominio reservado que no recibe correo). El teléfono, el WhatsApp (sin él no aparece el botón flotante) y la dirección
      están vacíos y, por tanto, ocultos en la web: rellénalos si quieres mostrarlos.
- [ ] **Datos del titular**, desde el panel (`/admin/ajustes/negocio`) o en `src/config/site.ts` (`business`): razón social
      o nombre y apellidos, NIF/CIF, domicilio fiscal y, si procede, datos registrales (obligatorios si el titular es una
      sociedad: p. ej. «Registro Mercantil de Madrid, Tomo X, Folio Y, Hoja Z»), y los proveedores de alojamiento, base de
      datos y correo con el país donde almacenan los datos (`processors`, para la política de privacidad). Aparecen
      resaltados en las páginas legales y en rojo en el panel mientras sigan siendo `[COMPLETAR…]`, y el arranque en
      producción lo registra como error.
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
- [ ] **Facturas**: el panel las emite y las envía por email (ver [Facturas](#facturas)), con los datos del titular de los
      ajustes y la dirección de envío como domicilio del destinatario. Decide si quieres pedir un domicilio fiscal distinto
      del de envío (ahora el cliente lo indicaría en la nota del pedido) y revisa con tu gestoría la serie, el formato y la
      conservación de las facturas.
- [ ] **Enlaces de seguimiento**: las URL de las webs de las mensajerías (`src/lib/carriers.ts`) no se han podido comprobar
      desde el entorno de desarrollo. Abre una con un código real la primera vez que uses cada transportista.
- [ ] **Información al cliente que solo tú puedes confirmar**: cómo se estampan las tazas (la web explica el DTF sobre prenda) y
      si son aptas para lavavajillas y microondas (ahora dice que no), el plazo de entrega a Baleares (la web dice «mensajería
      24-48 h» para todos los envíos), si estás adherida a algún sistema de arbitraje de consumo (ahora dice que no), el formato
      de hojas de reclamaciones obligatorio en tu comunidad autónoma, el plazo máximo de reembolso (14 días naturales) y la URL
      vigente de la política de cookies de PayPal.
- [ ] **Reembolsos**: el panel registra un reembolso, pero el dinero se devuelve desde PayPal.

## Facturas

En el detalle de un pedido cobrado (pagado, en producción, listo, enviado o entregado) el panel tiene el bloque
**Factura**:

- **Emitir factura** (`POST /api/admin/orders/[id]/invoice`, `{ "action": "issue" }`). Asigna el siguiente número de la
  serie del año, `F-2026-0001`, `F-2026-0002`…, con el contador `invoice:2026` de la tabla `counters`, que se incrementa
  dentro de la misma transacción de escritura que guarda la factura: dos emisiones simultáneas nunca repiten número (y
  `orders.invoice_number` tiene además un índice único). Es idempotente: repetir la emisión devuelve la misma factura. La
  serie se reinicia cada año (el año es el de la fecha de emisión en hora española).
- Se guarda en el pedido (`invoice_number`, `invoice_issued_at`, `invoice_json`) una **copia inmutable** de lo facturado:
  emisor (datos del titular y contacto de los ajustes en ese momento), destinatario (empresa o nombre, NIF/CIF si lo hay,
  dirección de envío), líneas con unidades, precio unitario sin IVA, base, tipo (21 %), cuota e importe, línea de envío,
  totales, forma de pago, fecha de pago y número de pedido. Cambiar después los ajustes o el pedido no la altera.
- **IVA**: los precios de la tienda llevan el IVA incluido. La base de cada línea es su importe dividido entre 1,21 y
  redondeado al céntimo; la cuota es la diferencia, de modo que en cada línea base + cuota = importe, y los totales son la
  suma de las líneas (base imponible + cuota = total exacto del pedido). El «IVA incluido» que la web calcula sobre el total
  puede diferir de la suma por líneas en uno o dos céntimos; el documento fiscal es la factura.
- **Ver e imprimir**: `/admin/pedidos/[id]/factura` (A4, blanco y negro; «Imprimir o guardar en PDF» usa el diálogo del
  navegador). El cliente tiene la misma factura en `/pedido/[id]/factura?t=<token>` (mismo token que el seguimiento,
  `noindex`, 404 sin factura o con token incorrecto) y un enlace **Descargar factura** en la página de su pedido.
- **Enviar por email** (`{ "action": "send" }`): manda al cliente el enlace (`sendInvoiceEmail`). La emisión y el envío
  quedan anotados en el historial del pedido.
- **Rectificativa** (`{ "action": "rectify" }`): si un pedido con factura pasa a reembolsado o cancelado, el panel avisa y
  permite emitir la factura rectificativa (serie `R-2026-0001`, contador `rectification:2026`) que anula la original con los
  mismos importes en negativo y la referencia a la factura rectificada. Se guarda en el mismo `invoice_json`
  (`{ invoice, rectification }`); el cliente la ve con `&doc=rectificativa`.
- Pedidos con **pago de demostración**: la factura sale marcada «Demostración · sin validez».
- El documento incluye lo que exige una factura en España: número y serie, fecha de expedición, nombre o razón social, NIF y
  domicilio del emisor, datos del destinatario (sin NIF, solo nombre y dirección), descripción de las operaciones, base
  imponible, tipo, cuota y total, y el pie «Factura emitida por <razón social>. Inscrita en <registro>» (el registro, si está
  en los ajustes del titular).

## Transportistas y seguimiento

`src/lib/carriers.ts` tiene la lista (Correos, Correos Express, SEUR, MRW, GLS, Nacex, DHL, UPS, Entrega en mano) con la
plantilla de URL de seguimiento de cada uno; `trackingUrlFor(transportista, código)` devuelve el enlace (código codificado
para URL) o `null` si el transportista no se reconoce, no tiene seguimiento en línea o el código está vacío. Al marcar un
pedido como enviado, el panel ofrece un desplegable con la lista y «Otro» (texto libre); el pedido guarda el nombre como
texto, así que los pedidos antiguos siguen valiendo. Si hay enlace, aparece como botón en el detalle del pedido, en la
página del cliente y en el email de «Enviado».

Las URL son las públicas de cada mensajería, pero **ninguna se ha podido comprobar** desde el entorno de desarrollo (sin
acceso a esas webs): comprueba cada una con un código real antes de confiar en ella. La de Nacex espera el código como
`agencia/albarán` (p. ej. `0801/12345678`).

## Estructura

```
src/
  app/
    (site)/      web pública, carrito, checkout, pedido, contenido y legales
    (studio)/    personalizador (pantalla completa, sin pie de página)
    admin/       panel de administración ((auth) = login, (panel) = protegido)
    api/         checkout, PayPal, subidas, archivos, presupuestos, contacto, admin
  components/    ui, mockups (ilustraciones SVG), editor, cart, checkout, admin, catalog, home, content, site
  config/        site.ts (negocio) y products.ts (catálogo, zonas y tarifas): valores por defecto
  lib/           pricing, design, pedidos, facturas, transportistas, base de datos, auth, emails, PayPal, límites de peticiones…
                 settings-schema.ts / settings.ts: ajustes editables desde el panel y catálogo efectivo
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

### Plantillas de diseño

El editor tiene una pestaña **Plantillas** con diseños listos (texto + pegatinas) agrupados por ocasión; la ficha de
cada producto destaca tres o cuatro y enlaza a `/personalizar/<producto>?plantilla=<id>`, que la aplica al arrancar (si
había un borrador con elementos, pregunta antes).

- **Dónde se definen:** `src/lib/templates.ts` (código puro, sin React ni Konva). Cada plantilla tiene `id`, `name`,
  `occasion`, `products` (`'all'` o una lista) y dos composiciones en una caja normalizada de 0 a 1: `portrait` para
  zonas verticales (frente de camiseta y sudadera) y `landscape` para las apaisadas (frontal de gorra, envolvente de
  taza). `build()` encaja la caja en el 86 % de la zona, mide los textos y devuelve capas normales del diseño: a partir
  de ahí se editan como cualquier otra (mover, cambiar texto, color, fuente, deshacer).
- **Colores:** `'auto'` es tinta oscura sobre prendas claras y blanca sobre oscuras (`isDarkSurface`); un color fijo que no
  contraste con la prenda recibe un contorno automático (textos) o pasa a `'auto'` (pegatinas).
- **Cómo añadir una:** copia una entrada de `TEMPLATES`, cambia el `id` (único), el nombre, la ocasión y las dos
  composiciones (`stack()` reparte líneas en vertical; `sticker()` coloca una pegatina de `src/lib/stickers.ts`; `text()`
  es un texto con caja explícita). Marca con `editable: true` el texto de ejemplo («TU NOMBRE»): es el que queda
  seleccionado, con el campo de texto enfocado, al aplicar la plantilla. Para destacarla en una ficha, añade su id a
  `FEATURED_TEMPLATES`; si usa una fuente nueva, importa su CSS en `src/components/catalog/TemplateIdeas.tsx`.
- **Miniaturas:** en el editor se dibujan fuera de pantalla con Konva sobre el producto y color actuales
  (`src/lib/editor/template-thumbs.ts`, con caché en memoria y bajo demanda); en la ficha de producto, y como repuesto
  si Konva fallara, se usa un SVG puro (`src/components/templates/TemplateSvgThumb.tsx`) con una medición aproximada
  de los textos.
- El panel usa una cookie de sesión firmada (JWT, 12 h, `HttpOnly`, prefijo `__Host-` en producción) y limita los
  intentos de acceso fallidos. Cerrar sesión revoca todas las sesiones abiertas.

## Licencia

Código del proyecto a medida. Las ilustraciones, pegatinas y textos son originales y no dependen de terceros;
las fuentes proceden de `@fontsource` (licencias abiertas SIL OFL).
