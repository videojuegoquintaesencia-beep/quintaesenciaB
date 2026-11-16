import { AdminShell } from '@/components/admin/AdminShell'
import { requireAdmin } from '@/lib/auth'
import { countNewQuotes } from '@/lib/quotes'

/** Todas las pantallas del panel (menos el login) exigen sesión de administrador. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  const newQuotes = await countNewQuotes()
  return <AdminShell newQuotes={newQuotes}>{children}</AdminShell>
}
