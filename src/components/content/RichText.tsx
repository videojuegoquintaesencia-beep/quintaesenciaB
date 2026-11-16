import Link from 'next/link'

const TOKEN = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/
const BOLD = /^\*\*([^*]+)\*\*$/

/** Pinta texto con el marcado mínimo de `lib/faq.ts`: `[texto](/ruta)` y `**negrita**`. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        const link = LINK.exec(part)
        if (link) {
          return (
            <Link key={i} href={link[2]} className="font-bold text-violet-deep underline">
              {link[1]}
            </Link>
          )
        }
        const bold = BOLD.exec(part)
        if (bold) return <strong key={i}>{bold[1]}</strong>
        return part
      })}
    </>
  )
}
