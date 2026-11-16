import { endAdminSession, isSameOrigin } from '@/lib/auth'
import { jsonError } from '@/lib/admin/api'

export const runtime = 'nodejs'

/** Cierra la sesión. Se usa desde un <form method="post">, así que responde con una redirección al login. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError('Origen no permitido', 403)
  await endAdminSession()
  return new Response(null, { status: 303, headers: { Location: '/admin/login' } })
}
