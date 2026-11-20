import { site } from '@/config/site'
import type { Order, OrderItem } from '@/lib/orders'
import { adminDate, adminDateTime } from '@/lib/admin/dates'
import { buildItemView, formatSizeCm } from '@/lib/admin/order-view'
import { unidades } from '@/lib/format'
import { FileImage } from './Thumb'
import { SizeMatrix } from './SizeMatrix'

const STEPS = ['Impreso', 'Planchado', 'Revisado', 'Empaquetado'] as const

/** Casillas para marcar a mano (o en pantalla) cada paso de producción de una línea. */
function Steps({ lineId }: { lineId: string }) {
  return (
    <fieldset className="mt-1 border-t-2 border-black pt-3">
      <legend className="sr-only">Pasos de producción</legend>
      <div className="flex flex-wrap gap-x-7 gap-y-2">
        {STEPS.map((step) => (
          <label key={step} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-xl font-bold print:min-h-0">
            <input type="checkbox" name={`${lineId}-${step}`} className="size-7 shrink-0 accent-black" />
            {step}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function ItemSection({ item, index }: { item: OrderItem; index: number }) {
  const view = buildItemView(item)
  const label = `${item.productName} ${item.colorName.toLowerCase()}`
  return (
    <section
      aria-labelledby={`hoja-${item.lineId}`}
      className="break-inside-avoid rounded-lg border-[3px] border-black"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-[3px] border-black bg-neutral-100 px-4 py-2.5 print:bg-white">
        <h2 id={`hoja-${item.lineId}`} className="flex items-center gap-3 text-2xl font-bold">
          <span
            aria-hidden="true"
            className="size-7 shrink-0 rounded-full border-2 border-black"
            style={{ backgroundColor: item.colorHex }}
          />
          {index + 1}. {item.productName} · {item.colorName}
        </h2>
        <p className="text-xl font-bold">{unidades(item.quantity)}</p>
      </header>

      <div className="space-y-4 p-4">
        <div className="overflow-x-auto">
          <SizeMatrix rows={view.sizeRows} large />
        </div>

        {item.note && (
          <p className="rounded-lg border-2 border-dashed border-black p-3 text-lg">
            <strong>Nota del cliente: </strong>
            {item.note}
          </p>
        )}

        {view.groups.map((group) => (
          <div key={group.viewId} className="grid grid-cols-1 gap-4 break-inside-avoid sm:grid-cols-[40mm_minmax(0,1fr)]">
            <figure className="w-[40mm] max-w-full">
              {group.previewFileId ? (
                <FileImage
                  fileId={group.previewFileId}
                  alt={`${label}, vista ${group.label.toLowerCase()}, con el diseño`}
                  width={group.imageSize.width}
                  height={group.imageSize.height}
                  eager
                  className="rounded-md border-2 border-black"
                />
              ) : (
                <div className="grid aspect-[6/7] place-items-center rounded-md border-2 border-dashed border-black text-center text-xs">
                  Sin imagen
                </div>
              )}
              <figcaption className="mt-1 text-center text-sm font-bold uppercase tracking-wide">{group.label}</figcaption>
            </figure>
            <ul className="space-y-3">
              {group.placements.map((p) => (
                <li key={p.areaId} className="flex flex-wrap items-start gap-3 break-inside-avoid">
                  <div className="min-w-[12rem] flex-1">
                    <p className="text-xl font-bold">{p.label}</p>
                    <p className="text-2xl font-bold tabular-nums">{formatSizeCm(p.bboxCm)}</p>
                    <p className="text-sm">Zona máxima {formatSizeCm(p.maxCm)}</p>
                    {p.layers.length > 0 && (
                      <ul className="mt-1 list-disc pl-5 text-sm">
                        {p.layers.map((l, i) => (
                          <li key={i} className="break-words">
                            {l}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!p.printFileId && <p className="mt-1 text-sm font-bold">¡Sin archivo de impresión!</p>}
                  </div>
                  {p.printFileId && (
                    <div className="w-[30mm] shrink-0">
                      <FileImage
                        fileId={p.printFileId}
                        alt={`Archivo de impresión: ${p.label}`}
                        width={120}
                        height={120}
                        checker
                        eager
                        className="rounded border-2 border-black"
                      />
                      <p className="mt-0.5 text-center text-[0.7rem] font-bold uppercase">Archivo</p>
                    </div>
                  )}
                </li>
              ))}
              {group.placements.length === 0 && <li className="text-sm">Sin estampados en esta vista.</li>}
            </ul>
          </div>
        ))}

        <Steps lineId={item.lineId} />
      </div>
    </section>
  )
}

/**
 * Hoja A4 de producción: legible en blanco y negro, con el pedido, las tallas, cada estampado y la etiqueta de envío.
 * `sender` es el remite de la etiqueta (nombre, dirección y teléfono efectivos), que la página construye con los ajustes.
 */
export function ProductionSheet({ order, sender }: { order: Order; sender: string }) {
  const units = order.items.reduce((n, i) => n + i.quantity, 0)
  const s = order.shipping
  return (
    <article
      aria-label={`Hoja de producción del pedido ${order.number}`}
      className="mx-auto w-full max-w-[210mm] space-y-5 rounded-2xl border-2 border-ink bg-white p-5 text-black shadow-pop-sm sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-[5px] border-black pb-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-widest">Hoja de producción · {site.name}</p>
          <p className="font-display text-7xl font-bold leading-none sm:text-8xl">{order.number}</p>
          <p className="mt-2 text-lg">
            Pedido del {adminDate(order.createdAt)}
            {order.payment.paidAt && <> · pagado el {adminDate(order.payment.paidAt)}</>}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-6xl font-bold leading-none tabular-nums">{units}</p>
          <p className="text-lg font-bold uppercase">{units === 1 ? 'unidad' : 'unidades'}</p>
        </div>
      </header>

      <p className="text-lg">
        <strong>{order.customerName}</strong>
        {order.company && <> · {order.company}</>} · Tel. {order.phone}
      </p>

      {order.customerNote && (
        <p className="rounded-lg border-[3px] border-black p-3 text-lg">
          <strong className="uppercase">Nota del cliente: </strong>
          {order.customerNote}
        </p>
      )}

      {order.items.map((item, i) => (
        <ItemSection key={item.lineId} item={item} index={i} />
      ))}

      <section
        aria-label="Etiqueta de envío"
        className="break-inside-avoid rounded-lg border-[3px] border-dashed border-black p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm font-extrabold uppercase tracking-widest">Enviar a</p>
          <p className="font-display text-3xl font-bold">{order.number}</p>
        </div>
        <address className="mt-1 not-italic">
          <p className="text-3xl font-bold leading-tight">{s.name}</p>
          {order.company && <p className="text-xl">{order.company}</p>}
          <p className="mt-1 text-2xl leading-snug">{s.line1}</p>
          {s.line2 && <p className="text-2xl leading-snug">{s.line2}</p>}
          <p className="text-2xl font-bold leading-snug">
            {s.postalCode} {s.city}
          </p>
          <p className="text-2xl leading-snug">{s.province} (España)</p>
          <p className="mt-2 text-xl">Tel. {order.phone}</p>
        </address>
        <p className="mt-4 border-t-2 border-black pt-2 text-sm">Remite: {sender}</p>
      </section>

      <p className="text-center text-xs">Impreso el {adminDateTime(new Date().toISOString())}</p>
    </article>
  )
}
