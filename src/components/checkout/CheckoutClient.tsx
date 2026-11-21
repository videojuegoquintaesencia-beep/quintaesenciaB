'use client'
import { TriangleExclamationPoint, Info, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCatalog } from '@/components/catalog/CatalogProvider'
import { EmptyCart } from '@/components/cart/CartView'
import { editHref, lineTitle } from '@/components/cart/line-utils'
import { usePricedLines } from '@/components/cart/lines'
import { useCartHydrated } from '@/components/cart/useCartHydrated'
import { useCart } from '@/lib/cart-store'
import { clearDraft } from '@/lib/editor/draft'
import { provinceFromPostalCode } from '@/lib/es-provinces'
import { computeCartTotals, isPostalCodeDeliverable, isValidSpanishPostalCode, normalizePostalCode } from '@/lib/pricing'
import type { PaymentMode } from '@/lib/paypal'
import { CheckoutError, postJson, type ApiFailure } from './api'
import { CheckoutForm } from './CheckoutForm'
import { CheckoutSummary } from './CheckoutSummary'
import { buildPayload, emptyValues, mapServerErrors, validateForm, type FormErrors, type FormValues } from './form-state'
import type { PaymentBridge } from './payment-types'
import { PaymentSection } from './PaymentSection'

export function CheckoutClient({ mode, paypalClientId }: { mode: PaymentMode; paypalClientId: string }) {
  const router = useRouter()
  // Reglas de envío efectivas (editables en el panel): zonas excluidas, tarifa y umbral de envío gratis.
  const { shipping: rules } = useCatalog()
  const { lines, clear, removeLine } = useCart()
  const hydrated = useCartHydrated()
  const priced = usePricedLines(lines)
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [serverErrors, setServerErrors] = useState<FormErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [failure, setFailure] = useState<ApiFailure | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const [finished, setFinished] = useState(false)

  // Carrito vacío → de vuelta al carrito (salvo justo después de pagar, que el carrito se vacía a propósito).
  useEffect(() => {
    if (hydrated && lines.length === 0 && !finished) router.replace('/carrito')
  }, [hydrated, lines.length, finished, router])

  const update = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => {
      const next = { ...v, [key]: value }
      if (key === 'name' && !v.shipNameTouched) next.shipName = value as string
      if (key === 'shipName') next.shipNameTouched = true
      return next
    })
  }, [])

  const onPostalCodeChange = useCallback(
    (raw: string) => {
      const cp = raw.replace(/\D/g, '').slice(0, 5)
      setValues((v) => {
        const next = { ...v, postalCode: cp }
        if (cp.length === 5 && isPostalCodeDeliverable(cp, rules)) next.province = provinceFromPostalCode(cp) ?? v.province
        return next
      })
    },
    [rules],
  )

  // Tras el primer intento de pago los errores se recalculan mientras el cliente corrige.
  const errors: FormErrors = useMemo(
    () => (attempted ? { ...validateForm(values, rules), ...serverErrors } : serverErrors),
    [attempted, values, rules, serverErrors],
  )

  const focusFirstError = useCallback(() => {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }, [])

  const valuesRef = useRef(values)
  const linesRef = useRef(lines)
  useEffect(() => {
    valuesRef.current = values
    linesRef.current = lines
  })

  const bridge: PaymentBridge = useMemo(
    () => ({
      processing,
      setProcessing,
      validate: () => {
        setFailure(null)
        setNotice(null)
        setAttempted(true)
        setServerErrors({})
        const found = validateForm(valuesRef.current, rules)
        if (Object.keys(found).length > 0) {
          focusFirstError()
          return false
        }
        return true
      },
      createServerOrder: async () => {
        const res = await postJson<{ orderId: string; paypalOrderId?: string }>(
          '/api/checkout',
          buildPayload(valuesRef.current, linesRef.current),
        )
        if (res.ok) return res.data
        setFailure(res.failure)
        if (res.failure.fieldErrors) {
          setServerErrors(mapServerErrors(res.failure.fieldErrors))
          focusFirstError()
        }
        throw new CheckoutError(res.failure)
      },
      onPaid: (redirect) => {
        setFinished(true)
        // El diseño ya es un pedido: si no se borra el borrador, el editor lo recuperaría como si siguiera pendiente.
        for (const productId of new Set(linesRef.current.map((l) => l.productId))) clearDraft(productId)
        clear()
        router.push(redirect)
      },
      onFailure: (f) => setFailure(f),
      onNotice: (m) => setNotice(m),
    }),
    [processing, clear, router, focusFirstError, rules],
  )

  if (!hydrated) {
    return <div className="card mt-8 h-72 animate-pulse bg-cream" aria-busy="true" aria-label="Cargando tu pedido" />
  }
  if (lines.length === 0) return finished ? null : <EmptyCart />

  const cp = normalizePostalCode(values.postalCode)
  const postalCodeKnown = isValidSpanishPostalCode(cp)
  const totals = computeCartTotals(
    priced.map((p) => p.price?.totalCents ?? 0),
    postalCodeKnown ? cp : undefined,
    rules,
  )
  const badLines = priced.filter((p) => p.error || failure?.lineIds?.includes(p.line.id))

  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="lg:order-2">
        <CheckoutSummary priced={priced} totals={totals} postalCodeKnown={postalCodeKnown} />
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-ink-soft">
          <Lock size={16} aria-hidden="true" /> Pago seguro. Precios con IVA incluido.
        </p>
      </div>

      <div ref={formRef} className="space-y-6 lg:order-1">
        <CheckoutForm values={values} errors={errors} onChange={update} onPostalCodeChange={onPostalCodeChange} />

        {badLines.length > 0 && (
          <div role="alert" className="card border-danger bg-danger-soft p-5">
            <p className="flex items-center gap-2 font-extrabold">
              <TriangleExclamationPoint size={20} aria-hidden="true" />
              {failure?.code === 'files_expired' ? 'Algunos diseños han caducado' : 'Revisa tu carrito'}
            </p>
            <p className="mt-1">{failure?.code === 'files_expired' ? failure.message : 'Alguna línea necesita tu atención antes de pagar.'}</p>
            <ul className="mt-3 space-y-2">
              {badLines.map((p) => (
                <li key={p.line.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{lineTitle(p)}</span>
                  {p.error && <span className="text-sm">({p.error})</span>}
                  <Link href={editHref(p.line)} className="btn btn-sm">
                    Rehacer diseño
                  </Link>
                  <button type="button" className="btn btn-sm" onClick={() => removeLine(p.line.id)}>
                    Quitar del carrito
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {failure && badLines.length === 0 && (
          <p role="alert" className="flex gap-2 rounded-2xl border-2 border-ink bg-danger-soft p-4 font-bold">
            <TriangleExclamationPoint size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {failure.message}
              {failure.code === 'zone' && (
                <>
                  {' '}
                  <Link href="/contacto" className="underline">
                    Escríbenos
                  </Link>
                  .
                </>
              )}
            </span>
          </p>
        )}
        {notice && (
          <p role="status" className="flex gap-2 rounded-2xl border-2 border-ink bg-sky-soft p-4 font-bold">
            <Info size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </p>
        )}

        <PaymentSection
          mode={mode}
          paypalClientId={paypalClientId}
          bridge={bridge}
          totalCents={totals.totalCents}
          shippingEstimated={!postalCodeKnown}
        />
      </div>

      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6" role="alertdialog" aria-live="assertive" aria-label="Procesando el pago">
          <p className="card px-6 py-5 text-center font-display text-xl">Confirmando tu pedido… no cierres esta página.</p>
        </div>
      )}
    </div>
  )
}
