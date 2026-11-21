'use client'
import dynamic from 'next/dynamic'
import type { ProductId } from '@/config/products'

/** Konva y todo el editor se cargan solo aquí, solo en el navegador. */
const Editor = dynamic(() => import('./Editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-dots-soft p-6 text-center" role="status">
      <p className="rounded-2xl border-2 border-ink bg-paper px-5 py-3 font-display text-lg shadow-pop-sm">Cargando el personalizador…</p>
    </div>
  ),
})

export function EditorLoader(props: { productId: ProductId; colorParam?: string; lineParam?: string; templateParam?: string }) {
  return <Editor {...props} />
}
