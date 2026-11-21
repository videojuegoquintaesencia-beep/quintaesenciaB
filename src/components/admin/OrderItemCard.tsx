import Link from 'next/link'
import { Download, FileImage as FileImageIcon, FileText, MessageSquareText } from 'lucide-react'
import { formatEUR, formatNumber, unidades } from '@/lib/format'
import type { FileMeta, PngSize } from '@/lib/files'
import { isQuoteItem, orderItemTitle, quoteLineNote } from '@/lib/order-items'
import type { OrderItem } from '@/lib/orders'
import {
  buildItemView,
  formatCm2,
  formatSizeCm,
  hasSizeBreakdown,
  type PlacementView,
  type QuoteSource,
  type ViewGroup,
} from '@/lib/admin/order-view'
import { FileImage } from './Thumb'
import { SizeMatrix } from './SizeMatrix'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function Fact({ label, value, wrap }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className={wrap ? 'font-bold tabular-nums' : 'whitespace-nowrap font-bold tabular-nums'}>{value}</dd>
    </div>
  )
}

const CM_PER_INCH = 2.54

/** "3.544 × 4.725 px · 300 ppp": píxeles del PNG y resolución real (px / tamaño del diseño en pulgadas). */
function describePrintFile(png: PngSize | undefined, bboxCm: PlacementView['bboxCm']): string | null {
  if (!png) return null
  const px = `${formatNumber(png.width)} × ${formatNumber(png.height)} px`
  const dpi = bboxCm && bboxCm.width > 0 ? Math.round(png.width / (bboxCm.width / CM_PER_INCH)) : png.dpi
  const parts = [px]
  if (dpi) parts.push(`${formatNumber(dpi)} ppp`)
  if (png.dpi === null) parts.push('sin ppp anotados')
  return parts.join(' · ')
}

function Placement({ placement, itemLabel, png }: { placement: PlacementView; itemLabel: string; png: PngSize | undefined }) {
  const fileInfo = describePrintFile(png, placement.bboxCm)
  return (
    <li className="rounded-xl border-2 border-ink/20 bg-cream/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h5 className="font-display text-lg font-semibold">{placement.label}</h5>
          <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Fact label="Diseño" value={formatSizeCm(placement.bboxCm)} />
            <Fact label="Superficie usada" value={formatCm2(placement.usedCm2)} />
            <Fact label="Zona máxima" value={formatSizeCm(placement.maxCm)} />
            {fileInfo && <Fact label="Archivo de impresión" value={fileInfo} wrap />}
          </dl>
          {placement.layers.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
              {placement.layers.map((layer, i) => (
                <li key={i} className="break-words">{layer}</li>
              ))}
            </ul>
          )}
        </div>
        {placement.printFileId && (
          <div className="w-24 shrink-0">
            <FileImage
              fileId={placement.printFileId}
              alt={`Archivo de impresión: ${placement.label} de ${itemLabel}`}
              width={96}
              height={96}
              checker
              className="max-h-24 rounded-lg border-2 border-ink/30"
            />
          </div>
        )}
      </div>
      {placement.printFileId ? (
        <a
          href={`/api/files/${placement.printFileId}?download=1`}
          download
          className="btn btn-teal btn-sm mt-3 w-full sm:w-auto"
        >
          <Download size={16} aria-hidden="true" />
          Descargar PNG de impresión
          <span className="sr-only">: {placement.label}</span>
        </a>
      ) : (
        <p className="mt-3 text-sm font-bold text-danger">Este estampado no tiene archivo de impresión guardado.</p>
      )}
    </li>
  )
}

function ViewBlock({ group, itemLabel, pngSizes }: { group: ViewGroup; itemLabel: string; pngSizes: Map<string, PngSize> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[11.5rem_minmax(0,1fr)]">
      <figure className="mx-auto w-full max-w-[14rem] sm:mx-0">
        {group.previewFileId ? (
          <a
            href={`/api/files/${group.previewFileId}`}
            target="_blank"
            rel="noopener"
            className="block overflow-hidden rounded-xl border-2 border-ink bg-white"
          >
            <FileImage
              fileId={group.previewFileId}
              alt={`${itemLabel}, vista ${group.label.toLowerCase()}, con el diseño del cliente`}
              width={group.imageSize.width}
              height={group.imageSize.height}
              eager
            />
            <span className="sr-only">Abrir imagen a tamaño completo (pestaña nueva)</span>
          </a>
        ) : (
          <div className="grid aspect-[6/7] place-items-center rounded-xl border-2 border-dashed border-ink/30 text-center text-sm text-ink-soft">
            Sin imagen de esta vista
          </div>
        )}
        <figcaption className="mt-1 text-center text-sm font-bold text-ink-soft">{group.label}</figcaption>
      </figure>
      {group.placements.length > 0 ? (
        <ul className="space-y-3" aria-label={`Estampados: ${group.label}`}>
          {group.placements.map((p) => (
            <Placement key={p.areaId} placement={p} itemLabel={itemLabel} png={p.printFileId ? pngSizes.get(p.printFileId) : undefined} />
          ))}
        </ul>
      ) : (
        <p className="self-center text-sm text-ink-soft">No hay estampados en esta vista.</p>
      )}
    </div>
  )
}

function FileLink({ id, meta, label }: { id: string; meta: FileMeta | undefined; label?: string }) {
  return (
    <a
      href={`/api/files/${id}?download=1`}
      download
      className="flex min-h-12 items-center gap-2.5 rounded-xl border-2 border-ink bg-white px-3 py-2 text-ink no-underline hover:bg-yellow-soft"
    >
      <FileImageIcon size={20} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{label ?? meta?.name ?? `Archivo ${id.slice(0, 8)}`}</span>
        <span className="block text-xs text-ink-soft">
          {meta ? `${meta.mime.replace('image/', '').toUpperCase()} · ${formatBytes(meta.size)}` : 'Archivo no encontrado'}
        </span>
      </span>
      <Download size={18} aria-hidden="true" className="shrink-0" />
      <span className="sr-only">Descargar</span>
    </a>
  )
}

/**
 * Línea de un presupuesto aceptado: no hay diseño, previews ni PNG de impresión. Se muestra la descripción y el
 * precio acordados, las tallas si la dueña las desglosó y los archivos que el cliente adjuntó al presupuesto.
 */
function QuoteItemCard({ item, index, quote }: { item: OrderItem; index: number; quote: QuoteSource | undefined }) {
  const view = buildItemView(item)
  return (
    <article aria-labelledby={`linea-${item.lineId}`} className="rounded-2xl border-2 border-ink bg-paper shadow-pop-sm">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-[0.85rem] border-b-2 border-ink bg-yellow-soft px-4 py-3">
        <h3 id={`linea-${item.lineId}`} className="flex min-w-0 items-center gap-2.5 text-xl">
          <FileText size={22} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <span className="text-ink-soft">{index + 1}. </span>
            {orderItemTitle(item)}
          </span>
        </h3>
        <p className="text-sm font-bold">
          {unidades(item.quantity)} · {formatEUR(item.totalCents)}
        </p>
      </header>

      <div className="space-y-5 p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
          {quote ? (
            <Link href={`/admin/presupuestos/${quote.id}`} className="text-violet-deep underline underline-offset-4">
              {quoteLineNote(quote.number)}
            </Link>
          ) : (
            quoteLineNote(null)
          )}
          {item.productId !== 'otro' && <span className="font-semibold text-ink-soft">· {item.productName}</span>}
        </p>

        <div>
          <h4 className="mb-1.5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Tallas</h4>
          {hasSizeBreakdown(item) ? (
            <div className="overflow-x-auto">
              <SizeMatrix rows={view.sizeRows} />
            </div>
          ) : (
            <p>{unidades(item.quantity)} sin desglose por tallas: acuérdalo con el cliente si hace falta.</p>
          )}
        </div>

        {item.note && (
          <div className="flex gap-2.5 rounded-xl border-2 border-ink bg-yellow-soft p-3">
            <MessageSquareText size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold">Nota del cliente para esta línea</p>
              <p className="whitespace-pre-wrap break-words">{item.note}</p>
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-1.5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Archivos adjuntos del presupuesto</h4>
          {quote && quote.files.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {quote.files.map((f) => (
                <li key={f.id}>
                  <FileLink id={f.id} meta={f} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">El presupuesto no tiene archivos adjuntos; los diseños se acuerdan por email.</p>
          )}
        </div>

        <p className="border-t-2 border-ink/10 pt-3 text-sm text-ink-soft">
          Precio por unidad acordado: {formatEUR(item.unitCents ?? item.unitBaseCents)}, IVA incluido.
        </p>
      </div>
    </article>
  )
}

/** Una línea del pedido: qué se fabrica, en qué tallas, con qué estampados y los archivos para imprimir. */
export function OrderItemCard({
  item,
  index,
  files,
  pngSizes,
  quote,
}: {
  item: OrderItem
  index: number
  files: Map<string, FileMeta>
  pngSizes: Map<string, PngSize>
  /** Presupuesto del que procede el pedido (para las líneas de presupuesto). */
  quote?: QuoteSource
}) {
  if (isQuoteItem(item)) return <QuoteItemCard item={item} index={index} quote={quote} />
  const view = buildItemView(item)
  const label = `${item.productName} ${item.colorName.toLowerCase()}`
  const artworks = view.artworkFileIds
  return (
    <article aria-labelledby={`linea-${item.lineId}`} className="rounded-2xl border-2 border-ink bg-paper shadow-pop-sm">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-[0.85rem] border-b-2 border-ink bg-violet-soft px-4 py-3">
        <h3 id={`linea-${item.lineId}`} className="flex min-w-0 items-center gap-2.5 text-xl">
          <span
            aria-hidden="true"
            className="size-6 shrink-0 rounded-full border-2 border-ink"
            style={{ backgroundColor: item.colorHex }}
          />
          <span className="min-w-0 break-words">
            <span className="text-ink-soft">{index + 1}. </span>
            {item.productName} · {item.colorName}
          </span>
        </h3>
        <p className="text-sm font-bold">
          {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} · {formatEUR(item.totalCents)}
          {item.discountPct > 0 && <span className="font-semibold text-ink-soft"> (−{item.discountPct}% por volumen)</span>}
        </p>
      </header>

      <div className="space-y-5 p-4">
        <div>
          <h4 className="mb-1.5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Tallas</h4>
          <div className="overflow-x-auto">
            <SizeMatrix rows={view.sizeRows} />
          </div>
        </div>

        {item.note && (
          <div className="flex gap-2.5 rounded-xl border-2 border-ink bg-yellow-soft p-3">
            <MessageSquareText size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold">Nota del cliente para esta línea</p>
              <p className="whitespace-pre-wrap break-words">{item.note}</p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {view.groups.map((group) => (
            <ViewBlock key={group.viewId} group={group} itemLabel={label} pngSizes={pngSizes} />
          ))}
          {view.groups.length === 0 && <p className="text-ink-soft">Esta línea no tiene estampados registrados.</p>}
        </div>

        {artworks.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Artes originales del cliente</h4>
            <ul className="grid gap-2 sm:grid-cols-2">
              {artworks.map((id) => (
                <li key={id}>
                  <FileLink id={id} meta={files.get(id)} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="border-t-2 border-ink/10 pt-3 text-sm text-ink-soft">
          Precio por unidad: {formatEUR(item.unitBaseCents)} del producto sin estampar
          {item.prints.length > 0 && ` + ${formatEUR(item.printCents)} de estampado`}
          {item.sizeSurchargeCents > 0 && `, más ${formatEUR(item.sizeSurchargeCents)} de suplemento de talla`}.
        </p>
      </div>
    </article>
  )
}
