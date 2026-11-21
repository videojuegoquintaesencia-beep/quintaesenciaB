'use client'

import { useRouter } from 'next/navigation'
import { ExternalLink, Plus, Save, Send, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { ProposalSummary } from '@/components/quotes/ProposalSummary'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { site } from '@/config/site'
import { formatEUR, unidades } from '@/lib/format'
import { newId } from '@/lib/ids'
import { vatIncludedCents } from '@/lib/pricing'
import {
  OTHER_PRODUCT_ID,
  PROPOSAL_DEFAULT_VALIDITY_DAYS,
  PROPOSAL_MAX_LINES,
  PROPOSAL_MAX_VALIDITY_DAYS,
  centsToEurosInput,
  formatValidUntil,
  isProposalExpired,
  parseEurosToCents,
  proposalInputSchema,
  type Proposal,
  type ProposalInput,
  type ProposalProductId,
} from '@/lib/proposal'
import { fieldErrors } from '@/lib/validators'
import { postJson } from '@/lib/admin/client'
import { adminDateTime } from '@/lib/admin/dates'
import { CopyButton } from './CopyButton'
import { Feedback } from './Feedback'
import { Panel } from './Panel'

export interface EditorProduct {
  id: ProposalProductId
  name: string
  sizes: { id: string; label: string }[]
}

/** Una línea tal y como se edita (texto en los campos numéricos; se convierte a céntimos al enviar). */
interface LineDraft {
  key: string
  lineId?: string
  productId: ProposalProductId
  description: string
  /** true: unidades por talla; false: un único número de unidades. */
  bySize: boolean
  quantity: string
  sizes: Record<string, string>
  unitEuros: string
}

interface SaveResponse {
  ok: true
  proposal: Proposal
  publicUrl?: string
  email?: 'sent' | 'simulated' | 'failed'
  emailError?: string
}

type Notice = { kind: 'success' | 'warning' | 'error'; text: string }

const hasBreakdown = (sizes: Record<string, number>) => Object.keys(sizes).some((s) => s !== 'unica')

function draftFromLine(line: Proposal['lines'][number]): LineDraft {
  const bySize = hasBreakdown(line.sizes)
  return {
    key: line.lineId,
    lineId: line.lineId,
    productId: line.productId,
    description: line.description,
    bySize,
    quantity: String(line.quantity),
    sizes: bySize ? Object.fromEntries(Object.entries(line.sizes).map(([k, v]) => [k, String(v)])) : {},
    unitEuros: centsToEurosInput(line.unitCents),
  }
}

function emptyLine(productId: ProposalProductId, description: string): LineDraft {
  return { key: newId(12), productId, description, bySize: false, quantity: '', sizes: {}, unitEuros: '' }
}

const toInt = (value: string): number | null => (/^\d{1,6}$/.test(value.trim()) ? Number(value.trim()) : null)

/** Convierte lo tecleado en el cuerpo de la API; devuelve los errores por campo si algo no es un número válido. */
function toInput(
  lines: LineDraft[],
  shippingEuros: string,
  validityDays: string,
  message: string,
  products: EditorProduct[],
): { input: ProposalInput | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const parsedLines = lines.map((line, i) => {
    const unitCents = parseEurosToCents(line.unitEuros)
    if (unitCents === null) errors[`lines.${i}.unitCents`] = 'Escribe un precio válido (por ejemplo 12,50).'
    let sizes: Record<string, number> = {}
    if (line.bySize) {
      const sizeIds = products.find((p) => p.id === line.productId)?.sizes.map((s) => s.id) ?? []
      for (const sizeId of sizeIds) {
        const raw = (line.sizes[sizeId] ?? '').trim()
        if (raw === '') continue
        const n = toInt(raw)
        if (n === null) errors[`lines.${i}.sizes`] = 'Las unidades por talla deben ser números enteros.'
        else if (n > 0) sizes[sizeId] = n
      }
      if (!errors[`lines.${i}.sizes`] && Object.keys(sizes).length === 0) errors[`lines.${i}.sizes`] = 'Indica las unidades de al menos una talla.'
    } else {
      const n = toInt(line.quantity)
      if (n === null || n < 1) errors[`lines.${i}.sizes`] = 'Indica las unidades (número entero mayor que cero).'
      else sizes = { unica: n }
    }
    return { lineId: line.lineId, productId: line.productId, description: line.description, sizes, unitCents: unitCents ?? 0 }
  })
  const shippingCents = parseEurosToCents(shippingEuros.trim() === '' ? '0' : shippingEuros)
  if (shippingCents === null) errors.shippingCents = 'Escribe un importe válido (0 si el envío va incluido).'
  const days = toInt(validityDays)
  if (days === null) errors.validityDays = 'Escribe un número de días.'
  if (Object.keys(errors).length > 0) return { input: null, errors }

  const candidate = { lines: parsedLines, shippingCents: shippingCents ?? 0, validityDays: days ?? 0, message }
  const parsed = proposalInputSchema.safeParse(candidate)
  if (!parsed.success) return { input: null, errors: fieldErrors(parsed.error) }
  return { input: parsed.data, errors: {} }
}

/** Unidades de una línea según lo tecleado (las casillas no numéricas cuentan como 0). */
function draftQuantity(line: LineDraft, products: EditorProduct[]): number {
  if (!line.bySize) return toInt(line.quantity) ?? 0
  const sizes = products.find((p) => p.id === line.productId)?.sizes ?? []
  return sizes.reduce((n, s) => n + (toInt(line.sizes[s.id] ?? '') ?? 0), 0)
}

function lineTotal(line: LineDraft, products: EditorProduct[]): number | null {
  const unit = parseEurosToCents(line.unitEuros)
  return unit === null ? null : draftQuantity(line, products) * unit
}

/** Totales en vivo (solo con lo que ya es un número válido). */
function liveTotals(lines: LineDraft[], shippingEuros: string, products: EditorProduct[]) {
  const subtotal = lines.reduce((sum, line) => sum + (lineTotal(line, products) ?? 0), 0)
  const units = lines.reduce((sum, line) => sum + draftQuantity(line, products), 0)
  const shipping = parseEurosToCents(shippingEuros.trim() === '' ? '0' : shippingEuros) ?? 0
  const total = subtotal + shipping
  return { subtotal, units, shipping, total, vat: vatIncludedCents(total, site.vatRate) }
}

/**
 * Panel "Propuesta de precio" del detalle de un presupuesto: líneas (producto del catálogo o texto libre, unidades,
 * precio unitario con IVA), envío, validez y mensaje. "Guardar borrador" no avisa al cliente; "Enviar" fija la validez,
 * crea el enlace público y manda el email. Una vez aceptada (hay pedido), la propuesta es de solo lectura.
 */
export function ProposalEditor({
  quoteId,
  customerEmail,
  initial,
  locked,
  publicUrl: initialPublicUrl,
  products,
  suggestedProductIds,
}: {
  quoteId: string
  customerEmail: string
  initial: Proposal | null
  /** La propuesta ya está aceptada (pedido vivo): no se puede modificar. */
  locked: boolean
  publicUrl: string | null
  products: EditorProduct[]
  /** Productos que pidió el cliente en el formulario, para prerrellenar la primera línea. */
  suggestedProductIds: string[]
}) {
  const router = useRouter()
  const uid = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [saved, setSaved] = useState<Proposal | null>(initial)
  const [publicUrl, setPublicUrl] = useState<string | null>(initialPublicUrl)
  const [lines, setLines] = useState<LineDraft[]>(() => {
    if (initial) return initial.lines.map(draftFromLine)
    const first = products.find((p) => suggestedProductIds.includes(p.id))
    return [first ? emptyLine(first.id, first.name) : emptyLine(OTHER_PRODUCT_ID, '')]
  })
  const [shippingEuros, setShippingEuros] = useState(initial ? centsToEurosInput(initial.shippingCents) : '0,00')
  const [validityDays, setValidityDays] = useState(String(initial?.validityDays ?? PROPOSAL_DEFAULT_VALIDITY_DAYS))
  const [message, setMessage] = useState(initial?.message ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'save' | 'send' | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const productOf = (id: ProposalProductId) => products.find((p) => p.id === id)
  const totals = liveTotals(lines, shippingEuros, products)
  const sent = !!saved?.sentAt
  const expired = saved ? isProposalExpired(saved) : false

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setNotice(null)
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function changeProduct(line: LineDraft, productId: ProposalProductId) {
    const product = productOf(productId)
    const previousName = productOf(line.productId)?.name ?? ''
    // Si la descripción era solo el nombre del producto anterior (o estaba vacía), se sustituye por el nuevo.
    const description = line.description.trim() === '' || line.description.trim() === previousName ? (product?.name ?? '') : line.description
    const canBreakdown = (product?.sizes.length ?? 0) > 1
    updateLine(line.key, { productId, description, bySize: canBreakdown && line.bySize, sizes: {} })
  }

  function addLine() {
    if (lines.length >= PROPOSAL_MAX_LINES) return
    setNotice(null)
    setLines((prev) => [...prev, emptyLine(OTHER_PRODUCT_ID, '')])
  }

  function removeLine(key: string) {
    setNotice(null)
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev))
  }

  function focusFirstError() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  }

  async function submit(action: 'save' | 'send') {
    if (busy) return
    setNotice(null)
    const { input, errors: found } = toInput(lines, shippingEuros, validityDays, message, products)
    setErrors(found)
    if (!input) {
      focusFirstError()
      return
    }
    if (action === 'send' && totals.total < 1) {
      setNotice({ kind: 'error', text: 'La propuesta debe tener un importe total mayor que cero para enviarla.' })
      return
    }
    setBusy(action)
    const result = await postJson<SaveResponse>(`/api/admin/quotes/${quoteId}/proposal`, { action, proposal: input })
    setBusy(null)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error })
      return
    }
    const proposal = result.data.proposal
    setSaved(proposal)
    setLines(proposal.lines.map(draftFromLine))
    if (result.data.publicUrl) setPublicUrl(result.data.publicUrl)
    if (action === 'save') setNotice({ kind: 'success', text: 'Borrador guardado. El cliente no recibe nada hasta que la envíes.' })
    else if (result.data.email === 'failed') {
      setNotice({
        kind: 'warning',
        text: `La propuesta está enviada y el enlace funciona, pero el email no ha salido${result.data.emailError ? ` (${result.data.emailError})` : ''}. Copia el enlace y házselo llegar al cliente.`,
      })
    } else {
      setNotice({
        kind: 'success',
        text:
          result.data.email === 'simulated'
            ? `Propuesta enviada a ${customerEmail} (email simulado: sin SMTP se imprime en la consola del servidor).`
            : `Propuesta enviada a ${customerEmail}.`,
      })
    }
    router.refresh()
  }

  const statusLine = locked
    ? `Aceptada por el cliente${saved?.acceptedAt ? ` el ${adminDateTime(saved.acceptedAt)}` : ''}.`
    : sent && saved
      ? `Enviada el ${adminDateTime(saved.sentAt)}${saved.validUntil ? ` · válida hasta el ${formatValidUntil(saved.validUntil)}` : ''}${expired ? ' · Caducada: reenvíala para renovar la validez' : ''}.`
      : saved
        ? `Borrador guardado el ${adminDateTime(saved.updatedAt)}. El cliente aún no la ha recibido.`
        : 'Todavía no hay propuesta: compón las líneas con su precio y envíasela al cliente.'

  const linkBlock = publicUrl && (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink/20 bg-cream/60 p-3">
      {/* El enlace ocupa toda la fila (si compartiera fila con los botones se partiría letra a letra en móvil). */}
      <p className="w-full text-sm">
        <span className="font-extrabold">Enlace del cliente:</span>{' '}
        <span className="break-all font-mono text-xs">{publicUrl}</span>
      </p>
      <CopyButton text={publicUrl} label="Copiar enlace" />
      <a href={publicUrl} target="_blank" rel="noopener" className="btn btn-sm">
        <ExternalLink size={16} aria-hidden="true" />
        Abrir
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      </a>
    </div>
  )

  if (locked && saved) {
    return (
      <Panel title="Propuesta de precio" id="propuesta" tone="teal">
        <p className="mb-3 text-sm font-bold">{statusLine} Ya no se puede modificar: lo que pagó el cliente es lo que se fabrica.</p>
        <ProposalSummary proposal={saved} />
        {saved.message && (
          <div className="mt-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Mensaje enviado al cliente</p>
            <p className="mt-1 whitespace-pre-wrap break-words rounded-xl border-2 border-ink/15 bg-paper p-3">{saved.message}</p>
          </div>
        )}
        {linkBlock && <div className="mt-4">{linkBlock}</div>}
      </Panel>
    )
  }

  return (
    <Panel title="Propuesta de precio" id="propuesta" tone="teal">
      <p className="mb-4 text-sm font-bold" aria-live="polite">
        {statusLine}
      </p>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit(sent ? 'send' : 'save')
        }}
        className="space-y-5"
      >
        <fieldset className="space-y-4">
          <legend className="label">Líneas de la propuesta</legend>
          {errors.lines && (
            <p className="field-error" role="alert">
              {errors.lines}
            </p>
          )}
          {lines.map((line, i) => {
            const product = productOf(line.productId)
            const canBreakdown = (product?.sizes.length ?? 0) > 1
            const total = lineTotal(line, products)
            const base = `${uid}-l${i}`
            return (
              <fieldset key={line.key} className="min-w-0 rounded-xl border-2 border-ink bg-paper p-3 sm:p-4">
                <legend className="px-1 font-display text-lg font-semibold">Línea {i + 1}</legend>
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length === 1}
                    className="btn btn-sm"
                    aria-label={`Quitar la línea ${i + 1}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Quitar
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                  <SelectField
                    id={`${base}-product`}
                    label="Producto"
                    value={line.productId}
                    error={errors[`lines.${i}.productId`]}
                    onChange={(e) => changeProduct(line, e.target.value as ProposalProductId)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value={OTHER_PRODUCT_ID}>Otro (texto libre)</option>
                  </SelectField>
                  <TextField
                    id={`${base}-description`}
                    label="Descripción"
                    required
                    value={line.description}
                    maxLength={300}
                    error={errors[`lines.${i}.description`]}
                    hint="Lo que verá el cliente: producto, color, estampado, acabados…"
                    onChange={(e) => updateLine(line.key, { description: e.target.value })}
                  />
                </div>
                {canBreakdown && (
                  <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 font-bold">
                    <input
                      type="checkbox"
                      checked={line.bySize}
                      onChange={(e) => updateLine(line.key, { bySize: e.target.checked, sizes: {} })}
                      className="size-5 cursor-pointer accent-pink"
                    />
                    Desglosar por tallas
                  </label>
                )}
                {line.bySize && product && (
                  <fieldset className="mt-2">
                    <legend className="label">Unidades por talla</legend>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((s) => (
                        <label key={s.id} className="flex flex-col items-center text-xs font-extrabold">
                          {s.label}
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.sizes[s.id] ?? ''}
                            onChange={(e) => updateLine(line.key, { sizes: { ...line.sizes, [s.id]: e.target.value } })}
                            aria-invalid={errors[`lines.${i}.sizes`] ? true : undefined}
                            aria-describedby={errors[`lines.${i}.sizes`] ? `${base}-sizes-error` : undefined}
                            className="input mt-1 w-16 px-2 text-center"
                          />
                        </label>
                      ))}
                    </div>
                    {errors[`lines.${i}.sizes`] && (
                      <p id={`${base}-sizes-error`} className="field-error" role="alert">
                        {errors[`lines.${i}.sizes`]}
                      </p>
                    )}
                  </fieldset>
                )}
                <div className={`mt-3 grid gap-3 sm:items-start ${line.bySize ? 'sm:grid-cols-[11rem_9rem]' : 'sm:grid-cols-[minmax(0,1fr)_11rem_9rem]'}`}>
                  {!line.bySize && (
                    <TextField
                      id={`${base}-quantity`}
                      label="Unidades"
                      required
                      inputMode="numeric"
                      value={line.quantity}
                      error={errors[`lines.${i}.sizes`]}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      className="sm:max-w-[9rem]"
                    />
                  )}
                  <TextField
                    id={`${base}-unit`}
                    label="Precio por unidad (€)"
                    required
                    inputMode="decimal"
                    placeholder="0,00"
                    value={line.unitEuros}
                    error={errors[`lines.${i}.unitCents`]}
                    hint="IVA incluido."
                    onChange={(e) => updateLine(line.key, { unitEuros: e.target.value })}
                  />
                  <div>
                    <p className="label">Total línea</p>
                    <p className="flex min-h-[2.9rem] items-center font-display text-xl font-semibold tabular-nums">{total === null ? '—' : formatEUR(total)}</p>
                  </div>
                </div>
              </fieldset>
            )
          })}
          <button type="button" onClick={addLine} disabled={lines.length >= PROPOSAL_MAX_LINES} className="btn btn-sm">
            <Plus size={16} aria-hidden="true" />
            Añadir línea
          </button>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id={`${uid}-shipping`}
            label="Coste de envío (€)"
            inputMode="decimal"
            value={shippingEuros}
            error={errors.shippingCents}
            hint="IVA incluido. Escribe 0 si va incluido en el precio."
            onChange={(e) => {
              setNotice(null)
              setShippingEuros(e.target.value)
            }}
          />
          <TextField
            id={`${uid}-validity`}
            label="Validez (días)"
            inputMode="numeric"
            value={validityDays}
            error={errors.validityDays}
            hint={`Días para aceptar desde el envío (máximo ${PROPOSAL_MAX_VALIDITY_DAYS}).`}
            onChange={(e) => {
              setNotice(null)
              setValidityDays(e.target.value)
            }}
          />
        </div>
        <TextAreaField
          id={`${uid}-message`}
          label="Mensaje para el cliente"
          value={message}
          maxLength={2000}
          error={errors.message}
          hint="Plazo de entrega, qué incluye, cómo seguir… Lo verá en el email y en la página de la propuesta."
          onChange={(e) => {
            setNotice(null)
            setMessage(e.target.value)
          }}
        />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border-2 border-ink bg-paper p-3 text-sm sm:grid-cols-4" aria-label="Totales de la propuesta">
          <div>
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-bold tabular-nums">{formatEUR(totals.subtotal)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Envío</dt>
            <dd className="font-bold tabular-nums">{formatEUR(totals.shipping)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Total</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{formatEUR(totals.total)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">IVA incluido ({Math.round(site.vatRate * 100)}&nbsp;%)</dt>
            <dd className="font-bold tabular-nums">{formatEUR(totals.vat)}</dd>
          </div>
        </dl>
        <p className="text-sm text-ink-soft">{unidades(totals.units)} en total.</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="plain" onClick={() => void submit('save')} disabled={busy !== null} aria-busy={busy === 'save'}>
            <Save size={18} aria-hidden="true" />
            {busy === 'save' ? 'Guardando…' : 'Guardar borrador'}
          </Button>
          <Button type="button" variant="primary" onClick={() => void submit('send')} disabled={busy !== null} aria-busy={busy === 'send'}>
            <Send size={18} aria-hidden="true" />
            {busy === 'send' ? 'Enviando…' : sent ? 'Reenviar al cliente' : 'Enviar al cliente'}
          </Button>
        </div>
        <p className="text-sm text-ink-soft">
          Al enviar, el cliente recibe un email con la propuesta y un enlace para aceptarla y pagarla. Mientras no la acepte puedes cambiarla y reenviarla.
        </p>
        {notice && <Feedback kind={notice.kind}>{notice.text}</Feedback>}
        {linkBlock}
      </form>
    </Panel>
  )
}
