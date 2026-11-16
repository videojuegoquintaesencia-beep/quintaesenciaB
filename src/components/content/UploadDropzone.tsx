'use client'
import { useState } from 'react'
import { CircleAlert, CircleCheck, FileImage, LoaderCircle, Upload, X } from 'lucide-react'
import { site } from '@/config/site'
import { cn } from '@/lib/cn'
import { MAX_UPLOADS, type UploadItem, type Uploads } from './useUploads'

const maxMb = Math.round(site.uploads.maxArtworkBytes / 1024 / 1024)

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function UploadRow({ item, onRemove }: { item: UploadItem; onRemove: () => void }) {
  return (
    <li className="card-flat flex items-center gap-3 p-2.5">
      <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-paper bg-[conic-gradient(#ece8f7_25%,#fff_0_50%,#ece8f7_0_75%,#fff_0)] bg-[length:14px_14px]">
        {item.previewUrl ? (
          // Miniatura local (blob:) del archivo elegido: next/image no puede optimizarla.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.previewUrl} alt="" className="size-full object-contain" />
        ) : (
          <FileImage aria-hidden="true" className="size-6 text-ink-soft" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{item.name}</span>
        {item.status === 'uploading' && (
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Subiendo…
          </span>
        )}
        {item.status === 'done' && (
          <span className="flex items-center gap-1.5 text-sm font-bold text-success">
            <CircleCheck aria-hidden="true" className="size-4" /> Subido · {sizeLabel(item.size)}
          </span>
        )}
        {item.status === 'error' && (
          <span className="flex items-start gap-1.5 text-sm font-bold text-danger">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> {item.error}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${item.name}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper transition-colors hover:bg-pink-soft"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </li>
  )
}

/** Zona para arrastrar o elegir archivos (hasta 5) con miniaturas y botón de quitar. */
export function UploadDropzone({ id, uploads, error }: { id: string; uploads: Uploads; error?: string }) {
  const [dragging, setDragging] = useState(false)
  const describedBy = [`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(' ')

  return (
    <fieldset>
      <legend className="label">
        Logotipo o diseño <span className="font-normal text-ink-soft">(opcional)</span>
      </legend>
      <div className="relative">
        <input
          id={id}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
          disabled={uploads.full}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="peer sr-only"
          onChange={(e) => {
            uploads.add(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (!uploads.full) uploads.add(Array.from(e.dataTransfer.files))
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-ink bg-paper px-4 py-6 text-center transition-colors hover:bg-yellow-soft',
            'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-violet',
            dragging && 'bg-yellow-soft',
            uploads.full && 'cursor-not-allowed opacity-60 hover:bg-paper',
            error && 'border-danger',
          )}
        >
          <Upload aria-hidden="true" className="size-7" />
          <span className="font-display text-lg font-semibold">
            {uploads.full ? 'Has llegado al máximo de archivos' : 'Arrastra tus archivos aquí o pulsa para elegirlos'}
          </span>
        </label>
      </div>
      <p id={`${id}-hint`} className="field-hint">
        PNG, JPG, WebP o SVG, hasta {maxMb} MB cada uno y un máximo de {MAX_UPLOADS} archivos. Mejor si tienen fondo transparente.
      </p>
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
      <div aria-live="polite">
        {uploads.notice && <p className="mt-2 text-sm font-bold text-ink-soft">{uploads.notice}</p>}
        {uploads.items.length > 0 && (
          <ul aria-label="Archivos adjuntos" className="mt-3 grid gap-3 sm:grid-cols-2">
            {uploads.items.map((item) => (
              <UploadRow key={item.key} item={item} onRemove={() => uploads.remove(item.key)} />
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  )
}
