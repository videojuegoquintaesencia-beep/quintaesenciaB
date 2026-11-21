'use client'
import { TriangleExclamationPoint, Info, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCatalog } from '@/components/catalog/CatalogProvider'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { PaymentSection } from '@/components/checkout/PaymentSection'
import { CheckoutError, postJson, type ApiFailure } from '@/components/checkout/api'
import {
  buildCustomerPayload,
  emptyValues,
  mapServerErrors,
  validateForm,
  type FormErrors,
  type FormValues,
} from '@/components/checkout/form-state'
import type { PaymentBridge } from '@/components/checkout/payment-types'
import { provinceFromPostalCode } from '@/lib/es-provinces'
import { isPostalCodeDeliverable } from '@/lib/pricing'
import type { PaymentMode } from '@/lib/paypal'

export interface AcceptPrefill {
  name: string
  email: string
  phone: string
  company: string
}

/**
 * Aceptación y pago de una propuesta de presupuesto. Reutiliza el formulario y el pago del checkout; la única
 * diferencia es que el pedido se crea en /api/quotes/[id]/accept a partir de la propuesta guardada en el servidor.
 * En modo `resume` (la propuesta ya se aceptó y el pedido sigue sin pagar) solo se muestra el pago.
 */
export function ProposalAcceptClient({
  quoteId,
  token,
  mode,
  paypalClientId,
  totalCents,
  prefill,
  resume,
  contactEmail,
  legalName,
}: {
  quoteId: string
  token: string
  mode: PaymentMode
  paypalClientId: string
  totalCents: number
  prefill: AcceptPrefill
  /** Pedido pendiente de pago ya creado para esta propuesta, si lo hay. */
  resume: { orderNumber: string } | null
  contactEmail: string
  /** Razón social del titular (ajustes del panel), para el texto de los consentimientos. */
  legalName: string
}) {
  // Reglas de envío efectivas (editables en el panel): mismas que usa el checkout para validar el código postal.
  const { shipping: rules } = useCatalog()
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(() => ({
    ...emptyValues,
    name: prefill.name,
    shipName: prefill.name,
    email: prefill.email,
    phone: prefill.phone,
    isCompany: prefill.company !== '',
    company: prefill.company,
  }))
  const [serverErrors, setServerErrors] = useState<FormErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [failure, setFailure] = useState<ApiFailure | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const update = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => {
      const next = { ...v, [key]: value }
      if (key === 'name' && !v.shipNameTouched) next.shipName = value as string
      if (key === 'shipName') next.shipNameTouched = true
      return next
    })
  }, [])

  const onPostalCodeChange = useCallback((raw: string) => {
    const cp = raw.replace(/\D/g, '').slice(0, 5)
    setValues((v) => {
      const next = { ...v, postalCode: cp }
      if (cp.length === 5 && isPostalCodeDeliverable(cp, rules)) next.province = provinceFromPostalCode(cp) ?? v.province
      return next
    })
  }, [rules])

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
  useEffect(() => {
    valuesRef.current = values
  })

  const bridge: PaymentBridge = useMemo(
    () => ({
      processing,
      setProcessing,
      validate: () => {
        setFailure(null)
        setNotice(null)
        if (resume) return true
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
          `/api/quotes/${quoteId}/accept`,
          resume ? { token } : { token, ...buildCustomerPayload(valuesRef.current) },
        )
        if (res.ok) return res.data
        setFailure(res.failure)
        if (res.failure.fieldErrors) {
          setServerErrors(mapServerErrors(res.failure.fieldErrors))
          focusFirstError()
        }
        // Pagada desde otra pestaña o dispositivo: al refrescar, la página pasa a enseñar el pedido ya aceptado.
        if (res.failure.code === 'already_paid') router.refresh()
        throw new CheckoutError(res.failure)
      },
      onPaid: (redirect) => router.push(redirect),
      onFailure: (f) => setFailure(f),
      onNotice: (m) => setNotice(m),
    }),
    [processing, resume, quoteId, token, router, focusFirstError, rules],
  )

  return (
    <div ref={formRef} className="space-y-6">
      {resume ? (
        <p role="status" className="card flex gap-3 bg-teal-soft p-5">
          <Info size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Ya aceptaste esta propuesta: tu pedido <strong>{resume.orderNumber}</strong> está creado y solo falta el pago. Si no lo
            completas, no se fabrica nada ni se cobra nada.
          </span>
        </p>
      ) : (
        <CheckoutForm
          values={values}
          errors={errors}
          onChange={update}
          onPostalCodeChange={onPostalCodeChange}
          legalName={legalName}
          contactEmail={contactEmail}
        />
      )}

      {failure && (
        <p role="alert" className="flex gap-2 rounded-2xl border-2 border-ink bg-danger-soft p-4 font-bold">
          <TriangleExclamationPoint size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {failure.message}
            {(failure.code === 'zone' || failure.code === 'expired' || failure.code === 'provider_changed') && (
              <>
                {' '}
                <a href={`mailto:${contactEmail}`} className="underline">
                  Escríbenos
                </a>
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
        contactEmail={contactEmail}
        mode={mode}
        paypalClientId={paypalClientId}
        bridge={bridge}
        totalCents={totalCents}
        shippingEstimated={false}
        step={resume ? null : 4}
      />
      <p className="flex items-center justify-center gap-2 text-center text-sm text-ink-soft">
        <Lock size={16} aria-hidden="true" /> Pago seguro. Precios con IVA incluido.
      </p>

      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6" role="alertdialog" aria-live="assertive" aria-label="Procesando el pago">
          <p className="card px-6 py-5 text-center font-display text-xl">Confirmando tu pedido… no cierres esta página.</p>
        </div>
      )}
    </div>
  )
}
