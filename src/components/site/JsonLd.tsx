type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined }

/** Quita recursivamente valores vacíos ('', null, undefined, [] y {}) para no publicar campos sin dato. */
export function compact<T extends Json | undefined>(value: T): T | undefined {
  if (Array.isArray(value)) {
    const items = value.map((v) => compact(v)).filter((v) => v !== undefined)
    return (items.length ? items : undefined) as T | undefined
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).flatMap(([k, v]) => {
      const c = compact(v as Json | undefined)
      return c === undefined ? [] : [[k, c] as const]
    })
    return (entries.length ? Object.fromEntries(entries) : undefined) as T | undefined
  }
  if (value === '' || value === null || value === undefined) return undefined
  return value
}

/** Datos estructurados (schema.org) en un <script type="application/ld+json">. */
export function JsonLd({ data }: { data: { [key: string]: Json | undefined } }) {
  const clean = compact(data)
  if (!clean) return null
  return (
    <script
      type="application/ld+json"
      // `<` se escapa para que ningún texto pueda cerrar el script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean).replace(/</g, '\\u003c') }}
    />
  )
}
