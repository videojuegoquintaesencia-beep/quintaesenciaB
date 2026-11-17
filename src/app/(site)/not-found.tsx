import type { Metadata } from 'next'
import { NotFoundContent } from '@/components/site/NotFoundContent'

export const metadata: Metadata = { title: 'Página no encontrada' }

/** 404 de las páginas de la tienda (p. ej. un pedido que no existe): el layout ya pinta cabecera, <main> y pie. */
export default function SiteNotFound() {
  return <NotFoundContent />
}
