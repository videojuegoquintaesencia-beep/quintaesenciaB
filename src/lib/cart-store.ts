'use client'
/**
 * Carrito de la compra (cliente). Se guarda en localStorage; los archivos (previews, impresión,
 * artes) ya están subidos al servidor y aquí solo se guardan sus ids.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ProductId } from '@/config/products'
import type { Design } from './design'
import { newId } from './ids'

export interface CartLine {
  id: string
  productId: ProductId
  colorId: string
  /** Unidades por talla (clave = id de talla; "unica" en productos de talla única). */
  sizes: Record<string, number>
  design: Design
  /** Imagen de cada vista del producto con el diseño aplicado (viewId → fileId). */
  previews: Record<string, string>
  /** PNG transparente listo para imprimir por zona usada (areaId → fileId). */
  printFiles: Record<string, string>
  note?: string
  addedAt: number
}

export type NewCartLine = Omit<CartLine, 'id' | 'addedAt'>

interface CartState {
  lines: CartLine[]
  /** true cuando el estado ya se ha leído de localStorage (evita desajustes de hidratación). */
  hydrated: boolean
  addLine: (line: NewCartLine) => string
  updateLine: (id: string, line: NewCartLine) => void
  setSizes: (id: string, sizes: Record<string, number>) => void
  removeLine: (id: string) => void
  clear: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      hydrated: false,
      addLine: (line) => {
        const id = newId(12)
        set((s) => ({ lines: [...s.lines, { ...line, id, addedAt: Date.now() }] }))
        return id
      },
      updateLine: (id, line) =>
        set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...line, id, addedAt: l.addedAt } : l)) })),
      setSizes: (id, sizes) => set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, sizes } : l)) })),
      removeLine: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'pieza-unica-cart-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      onRehydrateStorage: () => () => {
        useCart.setState({ hydrated: true })
      },
    },
  ),
)

/** Unidades totales en el carrito (0 hasta hidratar). */
export function useCartCount(): number {
  return useCart((s) => (s.hydrated ? s.lines.reduce((n, l) => n + Object.values(l.sizes).reduce((a, b) => a + b, 0), 0) : 0))
}
