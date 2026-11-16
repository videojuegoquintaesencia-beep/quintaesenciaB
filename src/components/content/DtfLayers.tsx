import { cn } from '@/lib/cn'

const LAYERS = [
  {
    name: 'Tinta de color (CMYK)',
    note: 'Tu diseño, lo que ves',
    className: 'bg-gradient-to-r from-pink via-yellow to-teal',
  },
  { name: 'Tinta blanca', note: 'Da base y hace que el color destaque', className: 'bg-paper' },
  { name: 'Adhesivo', note: 'Polvo fundido que fija el estampado', className: 'bg-yellow-soft bg-dots-soft' },
  { name: 'Tu prenda', note: 'Algodón o mezcla, clara u oscura', className: 'bg-violet-soft' },
] as const

/** Corte lateral de un estampado DTF, de arriba (lo que se ve) a abajo (la tela). */
export function DtfLayers() {
  return (
    <figure className="card p-5 sm:p-6">
      <ol aria-label="Capas del estampado DTF, de la superficie a la prenda" className="grid gap-2">
        {LAYERS.map((layer, i) => (
          <li
            key={layer.name}
            className={cn(
              'flex flex-col justify-center rounded-xl border-2 border-ink px-4 py-3',
              layer.className,
              i === LAYERS.length - 1 && 'py-6',
            )}
          >
            <span className="font-display text-lg font-semibold">{layer.name}</span>
            <span className="text-sm font-bold text-ink-soft">{layer.note}</span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 text-sm text-ink-soft">
        Así queda un estampado DTF visto de lado, de arriba abajo. El film solo sirve para transportar el diseño: se retira
        después de planchar.
      </figcaption>
    </figure>
  )
}
