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
| Empresas | `/empresas`, `/contacto` | Formulario de presupuesto con adjuntos y formulario de contacto |
| Legal | `/legal/aviso-legal`, `/legal/privacidad`, `/legal/cookies`, `/legal/condiciones` | Plantillas generales. **Deben revisarlas un profesional** |
| Administración | `/admin` | Resumen, pedidos (filtros, búsqueda, CSV), detalle con descarga de archivos de impresión, cambio de estado con email, hoja de producción imprimible, presupuestos y mensajes, ajustes del negocio (`/admin/ajustes`) |

### Reglas de negocio (están en `src/config/`)

- Precios en **céntimos de euro, IVA (21 %) incluido**. Precio de una línea = prenda + suplemento de color +
  estampado por zona (escalón según los cm² realmente ocupados) + suplemento de talla; después, descuento por
  cantidad (0 / 5 / 10 / 15 / 20 % a partir de 1 / 5 / 10 / 25 / 50 unidades).
- Envío 4,95 €, gratis desde 60 €, +3 € a Baleares. No se envía a Canarias, Ceuta ni Melilla desde la tienda online
  (códigos postales 35, 38, 51 y 52): para eso, presupuesto.
- Producción de 2 a 4 días laborables antes del envío.
- Productos, colores, tallas, zonas de impresión y tarifas: `src/config/products.ts`.
  Datos del negocio, envío y plazos: `src/config/site.ts`. Son los **valores por defecto**: lo que la dueña guarda en
  el panel (`/admin/ajustes`, tabla `settings`) se superpone a ellos sección a sección (ver «Ajustes desde el panel»).

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
   siendo de ejemplo tras aplicar lo guardado en el panel, `TRUSTED_PROXY_HOPS` sin definir, SMTP o webhook sin
   configurar…). Léelo.

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
  config/        site.ts (negocio) y products.ts (catálogo, zonas y tarifas): valores por defecto
  lib/           pricing, design, pedidos, base de datos, auth, emails, PayPal, límites de peticiones, settings (ajustes)…
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
