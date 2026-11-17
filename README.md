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
| Administración | `/admin` | Resumen, pedidos (filtros, búsqueda, CSV), detalle con descarga de archivos de impresión, cambio de estado con email, hoja de producción imprimible, presupuestos y mensajes |

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
- Si no hay SMTP, los emails **se imprimen en la consola del servidor**.

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
| `ADMIN_PASSWORD` | Contraseña del panel (mínimo 12 caracteres en producción) |
| `SESSION_SECRET` | Firma de la sesión del panel (≥ 32 caracteres: `openssl rand -base64 48`) |
| `PAYPAL_ENV`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` | PayPal (`sandbox` o `live`) |
| `ALLOW_DEMO_PAYMENTS` | `true` permite el pago simulado también en producción. **No activar con clientes reales** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Email saliente y dirección que recibe los avisos de pedidos y presupuestos |
| `TRUSTED_PROXY_HOPS` | Número de proxies propios delante de la app, para detectar la IP real en los límites de peticiones (por defecto 1; 0 = sin proxy) |

## Cómo salir a producción

1. **Hosting.** Cualquier plataforma que ejecute Next.js 16 con Node (por ejemplo Vercel). En plataformas sin disco
   persistente usa una base **Turso** en `DATABASE_URL`; los archivos de los clientes (imágenes, previews,
   PNG de impresión) se guardan en la propia base.
2. **Secretos.** Define `ADMIN_PASSWORD` y `SESSION_SECRET` (largos y aleatorios). Con `NODE_ENV=production` la
   contraseña de desarrollo deja de valer.
3. **PayPal.** Crea una app en el [panel de desarrolladores de PayPal](https://developer.paypal.com/dashboard/applications)
   (primero `sandbox`), rellena `NEXT_PUBLIC_PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`. Añade un webhook a
   `https://TU-DOMINIO/api/paypal/webhook` con los eventos de captura de pago y reembolso, y copia su id en
   `PAYPAL_WEBHOOK_ID`. Haz un pedido de prueba en sandbox antes de pasar a `live`.
4. **Email.** Rellena `SMTP_*`, `MAIL_FROM` (con un dominio verificado, SPF y DKIM) y `ADMIN_NOTIFY_EMAIL`.
5. **Dominio.** Fija `NEXT_PUBLIC_SITE_URL` al dominio definitivo.
6. **Proxy.** Ajusta `TRUSTED_PROXY_HOPS` al número de proxies que tienes delante.

Los límites de peticiones (subidas, checkout, formularios, login) viven en memoria de cada instancia. Con varias
instancias conviene sustituirlos por un almacén compartido (Redis/Upstash).

## Antes de publicar: lo que tienes que completar o decidir

- [ ] **Datos de contacto** en `src/config/site.ts` (`contact`): email, teléfono, WhatsApp, redes, dirección y horario.
      Ahora son valores de ejemplo (`hola@piezaunica.example`…).
- [ ] **Datos del titular** (`business`): razón social o nombre y apellidos, NIF/CIF, domicilio fiscal y, si procede,
      datos registrales. Aparecen resaltados en las páginas legales mientras sigan siendo `[COMPLETAR…]`.
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
- [ ] **Facturas**: el checkout recoge NIF/CIF y razón social si el cliente los indica. Decide cómo emites las facturas.
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
- El editor genera, al añadir al carrito, una vista previa por vista y un **PNG transparente a 300 dpi por zona** de
  impresión; el panel permite descargarlos para producción.
- Las subidas se validan por *magic bytes* (no por la extensión ni el tipo declarado), se rechazan SVG con contenido
  activo y los archivos se sirven con cabeceras restrictivas (`nosniff`, CSP *sandbox*).
- Los pedidos tienen un token público para el enlace de seguimiento (`/pedido/<id>?t=<token>`); la consulta manual
  pide número de pedido y email.
- El panel usa una cookie de sesión firmada (JWT, 12 h, `HttpOnly`) y limita los intentos de acceso fallidos.

## Licencia

Código del proyecto a medida. Las ilustraciones, pegatinas y textos son originales y no dependen de terceros;
las fuentes proceden de `@fontsource` (licencias abiertas SIL OFL).
