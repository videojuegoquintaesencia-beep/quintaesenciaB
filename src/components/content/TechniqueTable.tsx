import { cn } from '@/lib/cn'

const TECHNIQUES = ['DTF', 'Vinilo textil', 'Serigrafía', 'Sublimación'] as const

const ROWS: { label: string; cells: [string, string, string, string] }[] = [
  {
    label: 'Mejor para',
    cells: [
      'Diseños a todo color, fotos y pedidos de cualquier tamaño',
      'Letras, números y formas de pocos colores lisos',
      'Tiradas grandes del mismo diseño con pocos colores',
      'Poliéster claro y productos preparados para sublimar, como muchas tazas',
    ],
  },
  {
    label: 'Colores y degradados',
    cells: [
      'Todo el color, con degradados y fotos',
      'Colores planos; cada color extra suma una capa',
      'Un color por pantalla: brilla con colores planos y es menos práctica para fotos',
      'Todo el color, con degradados y fotos',
    ],
  },
  {
    label: 'Prendas oscuras',
    cells: [
      'Sí, gracias a la base de tinta blanca',
      'Sí',
      'Sí, con tintas opacas o una base blanca',
      'No es adecuada: necesita fondos blancos o muy claros',
    ],
  },
  {
    label: 'Tejidos',
    cells: [
      'Algodón y muchas mezclas',
      'Algodón y muchas mezclas',
      'Algodón y muchas mezclas',
      'Sobre todo poliéster o superficies con recubrimiento',
    ],
  },
  {
    label: 'Pedidos pequeños',
    cells: [
      'Muy adecuada: no hay que preparar pantallas',
      'Adecuada',
      'Menos práctica: cada diseño necesita su preparación',
      'Adecuada',
    ],
  },
  {
    label: 'Pedidos grandes',
    cells: [
      'Adecuada',
      'Se alarga cuando hay muchos colores o piezas',
      'Suele ser la más económica por unidad en tiradas muy grandes',
      'Adecuada',
    ],
  },
  {
    label: 'Tacto',
    cells: [
      'Capa fina y flexible que se nota ligeramente',
      'Lámina continua, algo más rígida',
      'La tinta se integra en la tela: muy suave',
      'Sin relieve: el color se integra en la fibra',
    ],
  },
]

/** Comparativa orientativa de técnicas de personalización textil. Sin cifras: depende de diseño, tejido y cantidad. */
export function TechniqueTable() {
  return (
    <>
      <p aria-hidden="true" className="mb-2 text-sm font-bold text-ink-soft lg:hidden">
        Desliza la tabla para ver todas las técnicas →
      </p>
      <div
        role="region"
        aria-label="Comparativa de técnicas de impresión (se desplaza en horizontal en pantallas estrechas)"
        tabIndex={0}
        className="card overflow-x-auto"
      >
        <table className="w-full min-w-[46rem] border-collapse text-left text-[0.95rem]">
          <caption className="sr-only">
            Comparativa entre DTF, vinilo textil, serigrafía y sublimación según el tipo de diseño, tejido, cantidad y tacto.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-36 border-b-2 border-b-ink bg-paper p-3">
                <span className="sr-only">Característica</span>
              </th>
              {TECHNIQUES.map((t, i) => (
                <th
                  key={t}
                  scope="col"
                  className={cn('border-b-2 border-l-2 border-b-ink border-l-ink p-3 font-display text-lg font-semibold', i === 0 ? 'bg-pink-soft' : 'bg-paper')}
                >
                  {t}
                  {i === 0 && <span className="mt-0.5 block text-xs font-bold text-ink-soft">La que usamos</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, r) => (
              <tr key={row.label}>
                <th
                  scope="row"
                  className={cn('sticky left-0 z-10 bg-paper p-3 align-top font-display font-semibold', r < ROWS.length - 1 && 'border-b border-b-ink/25')}
                >
                  {row.label}
                </th>
                {row.cells.map((cell, c) => (
                  <td
                    key={TECHNIQUES[c]}
                    className={cn(
                      'border-l-2 border-l-ink p-3 align-top text-ink-soft',
                      c === 0 && 'bg-pink-soft/40 text-ink',
                      r < ROWS.length - 1 && 'border-b border-b-ink/25',
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
