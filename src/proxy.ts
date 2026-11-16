/**
 * Protege el panel de administración: sin sesión válida, /admin redirige al login
 * y /api/admin responde 401. (En Next.js 16 `proxy.ts` sustituye a `middleware.ts`.)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth-token'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
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
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
