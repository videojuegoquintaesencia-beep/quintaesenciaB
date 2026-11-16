import { ChevronDown } from 'lucide-react'
import type { Faq } from './product-faqs'

/** Preguntas frecuentes con <details>: accesibles con teclado y sin JavaScript. */
export function ProductFaq({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="grid gap-3">
      {faqs.map((faq) => (
        <details key={faq.question} className="card-flat group open:shadow-pop">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-pop px-5 py-3 font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {faq.question}
            <ChevronDown
              aria-hidden="true"
              size={22}
              strokeWidth={2.6}
              className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <p className="px-5 pb-5 text-ink-soft">{faq.answer}</p>
        </details>
      ))}
    </div>
  )
}
