'use client'
/**
 * Catálogo efectivo (precios, descuentos, envíos y plazos que la dueña edita en el panel) para los componentes
 * de cliente. Lo provee una página o un layout de servidor con `await getCatalog()`: así el servidor y el
 * navegador renderizan exactamente los mismos importes (sin desajustes de hidratación).
 *
 * Sin proveedor (p. ej. un componente del carrito usado fuera de la tienda) se usan los precios en código,
 * que son también los valores por defecto del panel.
 */
import { createContext, useContext, type ReactNode } from 'react'
import type { Product } from '@/config/products'
import { DEFAULT_CATALOG, catalogProduct, type Catalog } from '@/lib/settings-schema'

const CatalogContext = createContext<Catalog>(DEFAULT_CATALOG)

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>
}

export function useCatalog(): Catalog {
  return useContext(CatalogContext)
}

/** Producto con los precios efectivos aplicados (undefined si el id no existe en el catálogo). */
export function useCatalogProduct(productId: string): Product | undefined {
  return catalogProduct(useCatalog(), productId)
}
