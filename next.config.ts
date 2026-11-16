import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://www.paypal.com")' },
]

const nextConfig: NextConfig = {
  // Cada agente/desarrollador puede usar su propio directorio de build: NEXT_DIST_DIR=.next-miagente
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  reactStrictMode: true,
  // Paquetes con binarios nativos o que no deben empaquetarse en el servidor.
  serverExternalPackages: ['@libsql/client', 'libsql', 'nodemailer'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
