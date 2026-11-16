import { ChevronDown } from 'lucide-react'
import type { FaqGroup } from '@/lib/faq'
import { RichText } from './RichText'

/** Preguntas de un grupo como <details>/<summary>: accesibles y con teclado sin JavaScript. */
export function FaqList({ group }: { group: FaqGroup }) {
  return (
    <div className="grid gap-3">
      {group.items.map((item) => (
        <details key={item.id} className="card-flat group transition-shadow open:shadow-pop">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[inherit] px-4 py-3 font-display text-lg font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-yellow transition-transform group-open:rotate-180"
            >
              <ChevronDown className="size-4" strokeWidth={3} />
            </span>
          </summary>
          <div className="grid gap-3 border-t-2 border-dashed border-ink/30 px-4 pb-5 pt-4 text-ink-soft sm:px-5">
            {item.answer.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
