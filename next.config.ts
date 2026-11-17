import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Política de seguridad de contenido (CSP). Sin "nonce" porque las páginas son estáticas (los nonces obligan a
 * renderizar cada petición): por eso los scripts en línea de Next.js necesitan 'unsafe-inline'. Aun así la política
 * acota todo lo demás: qué dominios pueden cargar scripts, imágenes, frames y conexiones (solo la propia tienda y
 * PayPal), impide incrustar la web en otras, fija <base> y <form action> y prohíbe <object>.
 */
const paypalHosts = 'https://*.paypal.com https://*.paypalobjects.com'
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${paypalHosts}${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${paypalHosts}`,
  "font-src 'self' data: https://*.paypalobjects.com",
  `connect-src 'self' ${paypalHosts}${isDev ? ' ws: wss:' : ''}`,
  `frame-src 'self' https://*.paypal.com`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://www.paypal.com")' },
  // HTTPS obligatorio durante 2 años (el navegador lo ignora si la web se abre por http). No lleva "preload":
  // inscribir el dominio en la lista de precarga es una decisión de la dueña (ver README).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Aísla la pestaña de otras ventanas, pero permite los popups de PayPal (necesitan window.opener).
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
]

const nextConfig: NextConfig = {
  // Cada agente/desarrollador puede usar su propio directorio de build: NEXT_DIST_DIR=.next-miagente
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  reactStrictMode: true,
  // Paquetes con binarios nativos o que no deben empaquetarse en el servidor.
  serverExternalPackages: ['@libsql/client', 'libsql', 'nodemailer'],
  experimental: {
    // proxy.ts solo intercepta /admin y /api/admin, cuyos cuerpos son JSON de unos pocos KB: se limita lo que
    // Next bufferiza en memoria para poder leerlo dos veces (por defecto, 10 MB por petición).
    proxyClientMaxBodySize: '100kb',
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // /api/files/* lleva su propia CSP, más estricta (sandbox), que no debe mezclarse con esta.
      { source: '/((?!api/files/).*)', headers: [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }] },
    ]
  },
}

export default nextConfig
