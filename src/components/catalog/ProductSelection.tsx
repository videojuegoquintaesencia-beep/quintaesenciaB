'use client'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product, ProductColor, ProductId } from '@/config/products'
import { useCatalogProduct } from './CatalogProvider'

interface Selection {
  product: Product
  color: ProductColor
  setColorId: (id: string) => void
}

const SelectionContext = createContext<Selection | null>(null)

/**
 * Comparte el color elegido entre la galería, el selector y los botones "Personalizar" de la ficha de producto.
 * El producto sale del catálogo efectivo (suplementos de color del panel). Las partes estáticas de la página
 * (descripción, precios, preguntas…) siguen siendo componentes de servidor.
 */
export function ProductSelectionProvider({ productId, children }: { productId: ProductId; children: ReactNode }) {
  const product = useCatalogProduct(productId)
  if (!product) throw new Error(`Producto desconocido: ${productId}`)
  const [colorId, setColorId] = useState(product.colors[0].id)

  const value = useMemo<Selection>(() => {
    const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0]
    return { product, color, setColorId }
  }, [product, colorId])

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useProductSelection(): Selection {
  const value = useContext(SelectionContext)
  if (!value) throw new Error('useProductSelection debe usarse dentro de <ProductSelectionProvider>')
  return value
}
