import type { ReactNode } from 'react'
import { Section } from '@/components/ui/Section'

/** Bloque final de llamada a la acción: título, texto y botones. */
export function CtaBand({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <Section tone="pink" aria-labelledby="cta-final">
      <div className="card mx-auto max-w-3xl p-6 text-center sm:p-10">
        <h2 id="cta-final" className="text-3xl sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-ink-soft">{children}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>
      </div>
    </Section>
  )
}
