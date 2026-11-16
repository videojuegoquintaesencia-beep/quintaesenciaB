import Image from 'next/image'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

const CHECKERBOARD: CSSProperties = {
  backgroundImage:
    'conic-gradient(#e9e6f2 25%, #ffffff 0 50%, #e9e6f2 0 75%, #ffffff 0)',
  backgroundSize: '14px 14px',
}

/**
 * Imagen servida por /api/files/[id]. Los archivos son privados y ya vienen optimizados por el editor,
 * así que no pasan por el optimizador de Next (`unoptimized`). Con `checker`, un fondo de ajedrez deja ver
 * la transparencia de los archivos de impresión.
 */
export function FileImage({
  fileId,
  alt,
  width,
  height,
  checker,
  eager,
  fit = 'auto',
  className,
}: {
  fileId: string
  alt: string
  width: number
  height: number
  checker?: boolean
  eager?: boolean
  /** `auto`: ocupa todo el ancho con su proporción; `box`: se ajusta al contenedor (que fija su tamaño). */
  fit?: 'auto' | 'box'
  className?: string
}) {
  return (
    <Image
      src={`/api/files/${fileId}`}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      loading={eager ? 'eager' : 'lazy'}
      style={checker ? CHECKERBOARD : undefined}
      className={cn('object-contain', fit === 'box' ? 'size-full' : 'h-auto w-full', className)}
    />
  )
}
