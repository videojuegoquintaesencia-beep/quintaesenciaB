/** Datos estructurados (schema.org) en un <script type="application/ld+json">. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // `<` se escapa para que ningún texto pueda cerrar el script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
