'use client'
/**
 * Precios editables desde el panel: por producto (precio base, suplementos por talla y color, escalones del
 * estampado por zona y tope de unidades) y la tabla global de descuentos por volumen.
 *
 * El formulario trabaja con textos (euros con coma) y al guardar convierte a céntimos, valida con el MISMO
 * esquema zod que la API (`pricingSchema`) y envía la sección completa. La vista previa del "precio desde" se
 * calcula en vivo con `fromPriceCents` sobre el producto con los precios del borrador.
 */
import { Plus, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { PRODUCTS, allAreas, fromPriceCents, isSingleSize, type PrintArea, type Product } from '@/config/products'
import { centsToEuroInput, decimalToInput, euroInputToCents, parseDecimalInput, parseIntegerInput } from '@/lib/admin/euros'
import { formatEUR, formatNumber } from '@/lib/format'
import {
  DEFAULT_SETTINGS,
  applyProductPricing,
  pricingSchema,
  productPricingSchema,
  type PricingSettings,
  type ProductPricing,
} from '@/lib/settings-schema'
import { fieldErrors } from '@/lib/validators'
import { Panel } from '../Panel'
import { FieldError, OverriddenBadge, SettingsActions, SettingsInput, focusFirstInvalid, useSettingsSection, type FieldErrors } from './shared'

/* ───────────── Borrador (textos de los campos) ───────────── */

interface TierDraft {
  upToCm2: string
  cents: string
}
interface DiscountDraft {
  minQty: string
  pct: string
}
interface ProductDraft {
  basePrice: string
  /** id de talla → euros ("" = sin suplemento). */
  sizeSurcharges: Record<string, string>
  /** id de color → euros ("" = sin suplemento). */
  colorSurcharges: Record<string, string>
  printTiers: Record<string, TierDraft[]>
  maxQtyPerLine: string
}
interface Draft {
  products: Record<string, ProductDraft>
  quantityDiscounts: DiscountDraft[]
}

const MONEY_ERROR = 'Escribe un importe en euros, p. ej. 8,90.'
const INT_ERROR = 'Escribe un número entero.'

function productToDraft(product: Product, pricing: ProductPricing): ProductDraft {
  const euros = (cents: number | undefined) => (cents ? centsToEuroInput(cents) : '')
  return {
    basePrice: centsToEuroInput(pricing.basePriceCents),
    sizeSurcharges: Object.fromEntries(product.sizes.map((s) => [s.id, euros(pricing.sizeSurchargesCents[s.id])])),
    colorSurcharges: Object.fromEntries(product.colors.map((c) => [c.id, euros(pricing.colorSurchargesCents[c.id])])),
    printTiers: Object.fromEntries(
      allAreas(product).map((a) => [
        a.id,
        (pricing.printTiers[a.id] ?? []).map((t) => ({ upToCm2: decimalToInput(t.upToCm2), cents: centsToEuroInput(t.cents) })),
      ]),
    ),
    maxQtyPerLine: String(pricing.maxQtyPerLine),
  }
}

function toDraft(settings: PricingSettings): Draft {
  return {
    products: Object.fromEntries(
      PRODUCTS.map((p) => [p.id, productToDraft(p, settings.products[p.id] ?? DEFAULT_SETTINGS.pricing.products[p.id]!)]),
    ),
    quantityDiscounts: settings.quantityDiscounts.map((d) => ({ minQty: String(d.minQty), pct: decimalToInput(d.pct) })),
  }
}

/** Convierte el borrador de un producto a céntimos; los errores van por ruta (`products.<id>.<campo>`). */
function parseProduct(product: Product, d: ProductDraft, errors: FieldErrors): ProductPricing {
  const base = `products.${product.id}`
  const basePriceCents = euroInputToCents(d.basePrice)
  if (basePriceCents === null) errors[`${base}.basePriceCents`] = MONEY_ERROR

  const surcharges = (map: Record<string, string>, key: string) => {
    const out: Record<string, number> = {}
    for (const [id, text] of Object.entries(map)) {
      if (!text.trim()) continue
      const cents = euroInputToCents(text)
      if (cents === null) errors[`${base}.${key}.${id}`] = MONEY_ERROR
      else if (cents > 0) out[id] = cents
    }
    return out
  }

  const printTiers: ProductPricing['printTiers'] = {}
  for (const [areaId, tiers] of Object.entries(d.printTiers)) {
    printTiers[areaId] = tiers.map((t, i) => {
      const upToCm2 = parseDecimalInput(t.upToCm2)
      const cents = euroInputToCents(t.cents)
      if (upToCm2 === null) errors[`${base}.printTiers.${areaId}.${i}.upToCm2`] = 'Escribe la superficie en cm².'
      if (cents === null) errors[`${base}.printTiers.${areaId}.${i}.cents`] = MONEY_ERROR
      return { upToCm2: upToCm2 ?? 0, cents: cents ?? 0 }
    })
  }

  const maxQtyPerLine = parseIntegerInput(d.maxQtyPerLine)
  if (maxQtyPerLine === null) errors[`${base}.maxQtyPerLine`] = INT_ERROR

  return {
    basePriceCents: basePriceCents ?? 0,
    sizeSurchargesCents: surcharges(d.sizeSurcharges, 'sizeSurchargesCents'),
    colorSurchargesCents: surcharges(d.colorSurcharges, 'colorSurchargesCents'),
    printTiers,
    maxQtyPerLine: maxQtyPerLine ?? 0,
  }
}

function parseDraft(draft: Draft): { value: PricingSettings | null; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const products: PricingSettings['products'] = {}
  for (const p of PRODUCTS) products[p.id] = parseProduct(p, draft.products[p.id], errors)
  const quantityDiscounts = draft.quantityDiscounts.map((d, i) => {
    const minQty = parseIntegerInput(d.minQty)
    const pct = parseDecimalInput(d.pct)
    if (minQty === null) errors[`quantityDiscounts.${i}.minQty`] = INT_ERROR
    if (pct === null) errors[`quantityDiscounts.${i}.pct`] = 'Escribe el porcentaje, p. ej. 5 o 7,5.'
    return { minQty: minQty ?? 0, pct: pct ?? 0 }
  })
  if (Object.keys(errors).length > 0) return { value: null, errors }
  // Mismo esquema que la API: topes, orden de escalones y de descuentos, tallas/colores/zonas conocidos.
  const parsed = pricingSchema.safeParse({ products, quantityDiscounts })
  if (!parsed.success) return { value: null, errors: fieldErrors(parsed.error) }
  return { value: parsed.data, errors: {} }
}

/** "Precio desde" con los precios del borrador, o null si el producto aún no es válido. */
function previewFromPrice(product: Product, d: ProductDraft): number | null {
  const errors: FieldErrors = {}
  const pricing = parseProduct(product, d, errors)
  if (Object.keys(errors).length > 0 || !productPricingSchema.safeParse(pricing).success) return null
  return fromPriceCents(applyProductPricing(product, pricing))
}

const areaCm2 = (area: PrintArea) => area.widthCm * area.heightCm

/* ───────────── Formulario ───────────── */

export function PricingForm({ initial, overridden: initialOverridden }: { initial: PricingSettings; overridden: boolean }) {
  const uid = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial))
  const [saved, setSaved] = useState<string>(() => JSON.stringify(toDraft(initial)))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [overridden, setOverridden] = useState(initialOverridden)
  const { busy, notice, setNotice, save, reset } = useSettingsSection('pricing')
  const dirty = JSON.stringify(draft) !== saved

  const updateProduct = (productId: string, fn: (d: ProductDraft) => ProductDraft) =>
    setDraft((prev) => ({ ...prev, products: { ...prev.products, [productId]: fn(prev.products[productId]) } }))
  const updateTiers = (productId: string, areaId: string, fn: (tiers: TierDraft[]) => TierDraft[]) =>
    updateProduct(productId, (d) => ({ ...d, printTiers: { ...d.printTiers, [areaId]: fn(d.printTiers[areaId] ?? []) } }))
  const updateDiscounts = (fn: (rows: DiscountDraft[]) => DiscountDraft[]) =>
    setDraft((prev) => ({ ...prev, quantityDiscounts: fn(prev.quantityDiscounts) }))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseDraft(draft)
    setErrors(result.errors)
    if (!result.value) {
      setNotice({ kind: 'error', text: 'Revisa los campos marcados: hay datos que faltan o no son válidos.' })
      focusFirstInvalid(formRef.current)
      return
    }
    if (await save(result.value, 'Precios guardados. La tienda, el editor y el carrito ya usan los nuevos importes.')) {
      const normalized = toDraft(result.value)
      setDraft(normalized)
      setSaved(JSON.stringify(normalized))
      setOverridden(true)
    }
  }

  async function restore() {
    if (await reset('Precios restablecidos: vuelven a aplicarse los valores por defecto.')) {
      const defaults = toDraft(DEFAULT_SETTINGS.pricing)
      setDraft(defaults)
      setSaved(JSON.stringify(defaults))
      setErrors({})
      setOverridden(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <OverriddenBadge overridden={overridden} />
        <p className="text-sm text-ink-soft">Importes en euros, IVA incluido. Se guardan todos los productos a la vez.</p>
      </div>

      {PRODUCTS.map((product) => {
        const d = draft.products[product.id]
        const base = `products.${product.id}`
        const id = (suffix: string) => `${uid}-${product.id}-${suffix}`
        const preview = previewFromPrice(product, d)
        return (
          <Panel
            key={product.id}
            id={`producto-${product.id}`}
            title={product.namePlural}
            actions={
              <p className="chip bg-teal-soft" aria-live="polite">
                {preview === null ? 'Precio desde: —' : `Precio desde: ${formatEUR(preview)}`}
              </p>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsInput
                id={id('base')}
                label="Precio base por unidad"
                value={d.basePrice}
                onChange={(v) => updateProduct(product.id, (p) => ({ ...p, basePrice: v }))}
                error={errors[`${base}.basePriceCents`]}
                hint={`${product.name} sin estampar.`}
                inputMode="decimal"
                suffix="€"
              />
              <SettingsInput
                id={id('max')}
                label="Tope de unidades por diseño"
                value={d.maxQtyPerLine}
                onChange={(v) => updateProduct(product.id, (p) => ({ ...p, maxQtyPerLine: v }))}
                error={errors[`${base}.maxQtyPerLine`]}
                hint="Por encima, el editor pide presupuesto."
                inputMode="numeric"
                suffix="uds."
              />
            </div>

            {!isSingleSize(product) && (
              <fieldset className="mt-5 min-w-0 border-0 p-0">
                <legend className="label">Suplemento por talla (por unidad)</legend>
                <p className="field-hint -mt-1 mb-2">Déjalo vacío o en 0 en las tallas sin suplemento.</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {product.sizes.map((size) => (
                    <SettingsInput
                      key={size.id}
                      id={id(`size-${size.id}`)}
                      label={size.label}
                      ariaLabel={`Suplemento de la talla ${size.label} en euros`}
                      value={d.sizeSurcharges[size.id] ?? ''}
                      onChange={(v) => updateProduct(product.id, (p) => ({ ...p, sizeSurcharges: { ...p.sizeSurcharges, [size.id]: v } }))}
                      error={errors[`${base}.sizeSurchargesCents.${size.id}`]}
                      inputMode="decimal"
                      suffix="€"
                    />
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="mt-5 min-w-0 border-0 p-0">
              <legend className="label">Suplemento por color (por unidad)</legend>
              <p className="field-hint -mt-1 mb-2">Déjalo vacío o en 0 en los colores sin suplemento.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {product.colors.map((color) => (
                  <SettingsInput
                    key={color.id}
                    id={id(`color-${color.id}`)}
                    label={
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden="true" className="inline-block size-4 shrink-0 rounded-full border-2 border-ink" style={{ backgroundColor: color.hex }} />
                        {color.name}
                      </span>
                    }
                    ariaLabel={`Suplemento del color ${color.name} en euros`}
                    value={d.colorSurcharges[color.id] ?? ''}
                    onChange={(v) => updateProduct(product.id, (p) => ({ ...p, colorSurcharges: { ...p.colorSurcharges, [color.id]: v } }))}
                    error={errors[`${base}.colorSurchargesCents.${color.id}`]}
                    inputMode="decimal"
                    suffix="€"
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-5 space-y-4">
              <p className="label">Estampado por zona (escalones según la superficie del diseño)</p>
              {allAreas(product).map((area) => {
                const tiers = d.printTiers[area.id] ?? []
                const zoneError = errors[`${base}.printTiers.${area.id}`]
                const lastTier = tiers.length > 0 ? parseDecimalInput(tiers[tiers.length - 1].upToCm2) : null
                const maxCm2 = areaCm2(area)
                const legendId = id(`zone-${area.id}`)
                return (
                  <fieldset key={area.id} aria-labelledby={legendId} className="min-w-0 rounded-xl border-2 border-ink/20 bg-cream/50 p-3">
                    <legend id={legendId} className="px-1 font-display text-base font-semibold">
                      {area.label}
                      <span className="ml-2 text-sm font-semibold text-ink-soft">
                        hasta {formatNumber(area.widthCm)} × {formatNumber(area.heightCm)} cm = {formatNumber(maxCm2)} cm²
                      </span>
                    </legend>
                    <ol className="space-y-2">
                      {tiers.map((tier, i) => (
                        <li key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[9rem_9rem_auto]">
                          <SettingsInput
                            id={id(`tier-${area.id}-${i}-cm2`)}
                            label={i === 0 ? 'Hasta' : <span className="sr-only">Hasta</span>}
                            ariaLabel={`Escalón ${i + 1} de ${area.label}: superficie máxima en cm²`}
                            value={tier.upToCm2}
                            onChange={(v) => updateTiers(product.id, area.id, (rows) => rows.map((r, j) => (j === i ? { ...r, upToCm2: v } : r)))}
                            error={errors[`${base}.printTiers.${area.id}.${i}.upToCm2`]}
                            inputMode="decimal"
                            suffix="cm²"
                            className="min-w-0"
                          />
                          <SettingsInput
                            id={id(`tier-${area.id}-${i}-eur`)}
                            label={i === 0 ? 'Precio por unidad' : <span className="sr-only">Precio por unidad</span>}
                            ariaLabel={`Escalón ${i + 1} de ${area.label}: precio por unidad en euros`}
                            value={tier.cents}
                            onChange={(v) => updateTiers(product.id, area.id, (rows) => rows.map((r, j) => (j === i ? { ...r, cents: v } : r)))}
                            error={errors[`${base}.printTiers.${area.id}.${i}.cents`]}
                            inputMode="decimal"
                            suffix="€"
                            className="min-w-0"
                          />
                          <button
                            type="button"
                            className="btn btn-sm col-span-2 mb-0.5 justify-self-start sm:col-span-1"
                            aria-label={`Quitar el escalón ${i + 1} de ${area.label}`}
                            disabled={tiers.length <= 1}
                            onClick={() => updateTiers(product.id, area.id, (rows) => rows.filter((_, j) => j !== i))}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={tiers.length >= 8}
                        onClick={() =>
                          updateTiers(product.id, area.id, (rows) => {
                            const prev = rows[rows.length - 1]
                            const prevCm2 = prev ? parseDecimalInput(prev.upToCm2) : null
                            const nextCm2 = prevCm2 === null ? '' : decimalToInput(Math.min(maxCm2, Math.round(prevCm2 * 1.5)))
                            return [...rows, { upToCm2: nextCm2, cents: prev?.cents ?? '' }]
                          })
                        }
                      >
                        <Plus size={16} aria-hidden="true" />
                        Añadir escalón
                      </button>
                      {lastTier !== null && lastTier < maxCm2 && (
                        <p className="text-sm text-ink-soft">Los diseños de más de {formatNumber(lastTier)} cm² se cobran al precio del último escalón.</p>
                      )}
                    </div>
                    <FieldError id={id(`zone-${area.id}-error`)} message={zoneError} />
                  </fieldset>
                )
              })}
            </div>
          </Panel>
        )
      })}

      <Panel id="descuentos" title="Descuentos por volumen" tone="yellow">
        <p className="mb-3 text-sm text-ink-soft">
          Se aplican a cada línea del pedido según sus unidades. El primer tramo suele empezar en 1 unidad con 0 %.
        </p>
        <ol className="space-y-2">
          {draft.quantityDiscounts.map((row, i) => (
            <li key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[9rem_9rem_auto]">
              <SettingsInput
                id={`${uid}-disc-${i}-qty`}
                label={i === 0 ? 'Desde' : <span className="sr-only">Desde</span>}
                ariaLabel={`Tramo ${i + 1}: unidades desde las que se aplica`}
                value={row.minQty}
                onChange={(v) => updateDiscounts((rows) => rows.map((r, j) => (j === i ? { ...r, minQty: v } : r)))}
                error={errors[`quantityDiscounts.${i}.minQty`]}
                inputMode="numeric"
                suffix="uds."
                className="min-w-0"
              />
              <SettingsInput
                id={`${uid}-disc-${i}-pct`}
                label={i === 0 ? 'Descuento' : <span className="sr-only">Descuento</span>}
                ariaLabel={`Tramo ${i + 1}: porcentaje de descuento`}
                value={row.pct}
                onChange={(v) => updateDiscounts((rows) => rows.map((r, j) => (j === i ? { ...r, pct: v } : r)))}
                error={errors[`quantityDiscounts.${i}.pct`]}
                inputMode="decimal"
                suffix="%"
                className="min-w-0"
              />
              <button
                type="button"
                className="btn btn-sm col-span-2 mb-0.5 justify-self-start sm:col-span-1"
                aria-label={`Quitar el tramo ${i + 1}`}
                disabled={draft.quantityDiscounts.length <= 1}
                onClick={() => updateDiscounts((rows) => rows.filter((_, j) => j !== i))}
              >
                <Trash2 size={16} aria-hidden="true" />
                Quitar
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="btn btn-sm mt-3"
          disabled={draft.quantityDiscounts.length >= 10}
          onClick={() => updateDiscounts((rows) => [...rows, { minQty: '', pct: '' }])}
        >
          <Plus size={16} aria-hidden="true" />
          Añadir tramo
        </button>
        <FieldError id={`${uid}-disc-error`} message={errors.quantityDiscounts} />
      </Panel>

      <SettingsActions
        saveLabel="Guardar precios"
        busy={busy}
        dirty={dirty}
        overridden={overridden}
        onReset={restore}
        notice={notice}
        description="Todos los precios, suplementos, escalones y descuentos vuelven a los valores de serie."
      />
    </form>
  )
}
