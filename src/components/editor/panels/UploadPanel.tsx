'use client'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ImagePlus, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { site } from '@/config/site'
import { cn } from '@/lib/cn'
import { primeImage } from '@/lib/editor/images'
import { useEditor } from '@/lib/editor/store'
import { ARTWORK_ACCEPT, uploadFile, validateArtwork } from '@/lib/editor/upload'
import type { ImageMap } from '../useImages'
import { ResolutionHint } from '../ResolutionHint'
import { Group, PanelTitle } from '../ui'

interface Pending {
  key: number
  name: string
  progress: number
}

const TIPS = [
  {
    title: 'PNG con fondo transparente',
    body: 'Si tu imagen tiene fondo (por ejemplo, blanco), se imprimirá también. Con un PNG transparente solo se imprime el dibujo.',
  },
  {
    title: '300 ppp al tamaño final',
    body: 'Cuantos más píxeles tenga la imagen, más nítida saldrá. Para un estampado de 20 cm de ancho, lo ideal son unos 2.400 píxeles de ancho.',
  },
  {
    title: 'Evita letras muy pequeñas',
    body: 'Los textos y trazos muy finos pierden detalle en la tela. Intenta que las letras midan más de 1 cm de alto.',
  },
]

let counter = 0

export function UploadPanel({ images }: { images: ImageMap }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const errorsRef = useRef<HTMLDivElement>(null)
  const selectedLayer = useEditor((s) => {
    const l = s.design.areas[s.areaId]?.layers.find((x) => x.id === s.selectedId)
    return l?.type === 'image' ? l : null
  })

  // En móvil el panel es bajo: los errores se pintan arriba del todo y se traen a la vista al aparecer.
  useEffect(() => {
    if (errors.length > 0) errorsRef.current?.scrollIntoView({ block: 'nearest' })
  }, [errors])

  const addError = (message: string) => setErrors((prev) => [...prev.slice(-3), message])

  const handleFiles = (list: FileList | File[]) => {
    for (const file of Array.from(list)) {
      const problem = validateArtwork(file)
      if (problem) {
        addError(problem)
        continue
      }
      const key = ++counter
      setPending((p) => [...p, { key, name: file.name, progress: 0 }])
      uploadFile(file, 'artwork', {
        onProgress: (progress) => setPending((p) => p.map((x) => (x.key === key ? { ...x, progress } : x))),
      })
        .then(async (uploaded) => {
          const loaded = await primeImage(uploaded.id, file).catch(() => null)
          if (!loaded) throw new Error(`No hemos podido leer «${file.name}». Prueba con otro archivo.`)
          useEditor.getState().addImage({
            fileId: uploaded.id,
            name: file.name,
            naturalWidth: loaded.naturalWidth,
            naturalHeight: loaded.naturalHeight,
          })
        })
        .catch((e: unknown) => addError(e instanceof Error ? e.message : 'No se pudo subir el archivo.'))
        .finally(() => setPending((p) => p.filter((x) => x.key !== key)))
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  const maxMb = Math.round(site.uploads.maxArtworkBytes / 1024 / 1024)

  return (
    <div>
      <PanelTitle hint="Logotipos, dibujos o fotos. Se colocan centrados en la zona elegida.">Sube tu imagen</PanelTitle>

      {pending.length > 0 && (
        <ul className="mb-3 grid gap-2" aria-label="Subidas en curso">
          {pending.map((p) => (
            <li key={p.key} className="flex items-center gap-2 rounded-xl border-2 border-ink bg-paper p-2.5 text-sm">
              <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin" />
              <span className="min-w-0 flex-1 truncate font-bold">Subiendo {p.name}…</span>
              <span className="tabular-nums text-ink-soft">{Math.round(p.progress * 100)} %</span>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <div ref={errorsRef} role="alert" className="mb-3 scroll-mt-2">
          <ul className="grid gap-2">
            {errors.map((message, i) => (
              <li key={`${i}-${message}`} className="flex items-start gap-2 rounded-xl border-2 border-ink bg-danger-soft p-2.5 text-sm font-bold">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1">{message}</span>
                <button
                  type="button"
                  aria-label="Descartar aviso"
                  className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-white/60"
                  onClick={() => setErrors((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-ink p-5 text-center transition-colors',
          dragging ? 'bg-teal-soft' : 'bg-paper',
        )}
      >
        <ImagePlus aria-hidden="true" className="size-8 text-violet-deep" />
        <p className="font-bold">Arrastra aquí tu archivo</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => inputRef.current?.click()}>
          Elegir archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ARTWORK_ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo de imagen"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <p className="text-sm text-ink-soft">PNG, JPG, WebP o SVG · hasta {maxMb} MB</p>
      </div>

      {selectedLayer && (
        <Group title="Calidad de la imagen seleccionada" className="mt-5">
          <ResolutionHint layer={selectedLayer} image={images[selectedLayer.fileId]} />
        </Group>
      )}

      <Group title="Consejos para que salga perfecto" className="mt-5">
        <div className="grid gap-2">
          {TIPS.map((t) => (
            <details key={t.title} className="group rounded-2xl border-2 border-ink bg-paper px-3.5 py-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-bold [&::-webkit-details-marker]:hidden">
                {t.title}
                <span aria-hidden="true" className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-2.5 text-sm text-ink-soft">{t.body}</p>
            </details>
          ))}
        </div>
      </Group>
    </div>
  )
}
