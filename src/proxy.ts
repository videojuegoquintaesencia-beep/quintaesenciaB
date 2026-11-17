/**
 * Dos tareas:
 *  1. Protege el panel de administración: sin sesión válida, /admin redirige al login y /api/admin responde 401.
 *     (Es la primera barrera; las páginas y rutas del panel vuelven a comprobar la sesión por su cuenta.)
 *  2. Rechaza con 404 las rutas con codificación de porcentaje inválida (p. ej. /pedido/%ff): Next.js no
 *     las decodifica y en producción responden 500 "Internal Server Error", lo que llena de ruido la monitorización.
 * (En Next.js 16 `proxy.ts` sustituye a `middleware.ts`.)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth-token'

/** Ruta decodificada (null si la codificación de porcentaje es inválida). */
function decodedPath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return null
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const decoded = decodedPath(pathname)
  if (decoded === null) {
    return new NextResponse('No encontrado', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
  // Se decodifica, se pasa a minúsculas y se colapsan barras antes de decidir si es el panel: así variantes como
  // /%61dmin, /ADMIN o //admin no se libran de la comprobación. Ante la duda, se protege.
  const normalized = decoded.toLowerCase().replace(/\/{2,}/g, '/')
  if (!(normalized.startsWith('/admin') || normalized.startsWith('/api/admin'))) return NextResponse.next()

  if (pathname === '/admin/login' || pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    const res = NextResponse.next()
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return res
  }

  const ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)
  if (ok) {
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'no-store')
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return res
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = '/admin/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  // El panel, y todas las páginas y /api/files (que tienen parámetros dinámicos). El resto de /api no pasa por
  // aquí: Next bufferiza en memoria los cuerpos de las peticiones que atraviesan el proxy.
  matcher: ['/admin/:path*', '/api/admin/:path*', '/((?!_next/|api/(?!files/)).*)'],
}
