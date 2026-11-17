import { CircleCheck, TriangleAlert } from 'lucide-react'
import type { ImageLayer } from '@/lib/design'
import { GOOD_DPI, LOW_DPI, PRINT_DPI } from '@/lib/editor/constants'
import { effectiveDpi } from '@/lib/editor/geometry'
import type { LoadedImage } from '@/lib/editor/images'
import { cn } from '@/lib/cn'

/** Aviso de calidad de una imagen según los píxeles que tiene frente al tamaño al que se imprime. */
export function ResolutionHint({ layer, image }: { layer: ImageLayer; image?: LoadedImage | 'error' }) {
  if (image === 'error') {
    return (
      <p role="alert" className="flex gap-2 rounded-xl border-2 border-ink bg-danger-soft p-2.5 text-sm font-bold">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Esta imagen ya no está disponible en el servidor. Elimínala y vuelve a subirla.
      </p>
    )
  }
  if (image?.vector) {
    return (
      <p className="flex gap-2 rounded-xl border-2 border-ink bg-teal-soft p-2.5 text-sm font-bold">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Imagen vectorial: se imprime nítida a cualquier tamaño.
      </p>
    )
  }
  const dpi = Math.round(effectiveDpi(layer.naturalWidth, layer.width))
  const low = dpi < LOW_DPI
  const ok = dpi >= GOOD_DPI
  return (
    <p
      className={cn(
        'flex gap-2 rounded-xl border-2 border-ink p-2.5 text-sm font-bold',
        low ? 'bg-yellow-soft' : ok ? 'bg-teal-soft' : 'bg-paper',
      )}
      role={low ? 'status' : undefined}
    >
      {low ? <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
      {low
        ? `Resolución baja (${dpi} ppp), puede verse pixelado. Reduce el tamaño o sube una imagen más grande.`
        : ok
          ? `Resolución buena (${dpi} ppp).`
          : `Resolución aceptable (${dpi} ppp). Para el máximo detalle, lo ideal son ${PRINT_DPI} ppp.`}
    </p>
  )
}
