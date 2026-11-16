import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/admin/LoginForm'
import { site } from '@/config/site'
import { isAdmin } from '@/lib/auth'

export const metadata: Metadata = { title: 'Entrar' }

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin')

  return (
    <main className="bg-dots-soft grid min-h-dvh place-items-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="sticker mb-5 text-lg">{site.name}</p>
        <div className="rounded-2xl border-2 border-ink bg-paper p-6 shadow-pop sm:p-7">
          <h1 className="text-3xl">Panel de gestión</h1>
          <p className="mb-5 mt-1 text-ink-soft">Entra para ver los pedidos y preparar la producción.</p>
          <LoginForm />
        </div>
        <p className="mt-5 text-center text-sm">
          <Link href="/" className="font-bold text-violet-deep">
            ← Volver a la tienda
          </Link>
        </p>
      </div>
    </main>
  )
}
