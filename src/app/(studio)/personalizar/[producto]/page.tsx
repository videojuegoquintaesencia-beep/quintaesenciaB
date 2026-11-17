import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EditorLoader } from '@/components/editor/EditorLoader'
import { PRODUCTS, getProduct } from '@/config/products'

type Props = {
  params: Promise<{ producto: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ producto: p.id }))
}

// Catálogo cerrado: cualquier otro producto responde 404 con la página de error de toda la web.
export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { producto } = await params
  const product = getProduct(producto)
  if (!product) return { title: 'Página no encontrada' }
  return {
    title: `Personaliza tu ${product.name.toLowerCase()}`,
    description: `Diseña tu ${product.name.toLowerCase()} online: sube tu imagen, añade texto y pegatinas y mira el resultado antes de pedir.`,
    alternates: { canonical: `/personalizar/${product.id}` },
  }
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function EditorPage({ params, searchParams }: Props) {
  const { producto } = await params
  const product = getProduct(producto)
  if (!product) notFound()
  const query = await searchParams
  return <EditorLoader productId={product.id} colorParam={first(query.color)} lineParam={first(query.linea)} />
}
