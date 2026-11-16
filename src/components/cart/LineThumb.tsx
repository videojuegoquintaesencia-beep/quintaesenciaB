'use client'
import Image from 'next/image'
import { cn } from '@/lib/cn'

/** Miniatura de la vista previa de una línea (con alternativa si el archivo ya no existe). */
export function LineThumb({
  fileId,
  alt,
  size,
  className = 'h-24 w-24',
  onMissing,
}: {
  fileId: string | null
  alt: string
  /** Lado en píxeles con el que se pide la imagen (se ve en `className`). */
  size: number
  className?: string
  onMissing?: () => void
}) {
  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-2xl border-2 border-ink bg-cream bg-dots-soft', className)}>
      {fileId ? (
        <Image
          src={`/api/files/${fileId}`}
          alt={alt}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-contain"
          onError={onMissing}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center p-2 text-center text-xs font-bold text-ink-soft">
          Sin vista previa
        </span>
      )}
    </div>
  )
}
