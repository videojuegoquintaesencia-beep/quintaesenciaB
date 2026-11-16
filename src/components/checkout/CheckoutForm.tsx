'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { site } from '@/config/site'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { DELIVERABLE_PROVINCES } from '@/lib/es-provinces'
import { isUndeliverablePostalCode, type FormErrors, type FormValues } from './form-state'

function Section({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby={`sec-${number}`}>
      <h2 id={`sec-${number}`} className="flex items-center gap-3 text-2xl">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-yellow font-display text-lg">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener" className="font-bold text-violet-deep underline">
      {children}
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </Link>
  )
}

function Consent({
  id,
  checked,
  error,
  onChange,
  children,
}: {
  id: string
  checked: boolean
  error?: string
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-pink aria-[invalid=true]:outline aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-danger"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="field-error ml-8" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function CheckoutForm({
  values,
  errors,
  onChange,
  onPostalCodeChange,
}: {
  values: FormValues
  errors: FormErrors
  onChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void
  onPostalCodeChange: (value: string) => void
}) {
  const zoneProblem = isUndeliverablePostalCode(values.postalCode)
  const postalError = zoneProblem
    ? `Aún no enviamos a ${site.shipping.excludedZonesLabel} desde la tienda online.`
    : errors['ship.postalCode']

  return (
    <div className="space-y-6">
      <Section number={1} title="Tus datos">
        <TextField
          label="Nombre y apellidos"
          name="name"
          autoComplete="name"
          required
          value={values.name}
          error={errors.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="sm:col-span-2"
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={values.email}
          error={errors.email}
          hint="Te enviamos aquí la confirmación y el seguimiento."
          onChange={(e) => onChange('email', e.target.value)}
        />
        <TextField
          label="Teléfono"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          value={values.phone}
          error={errors.phone}
          hint="Solo para el reparto o si hay algo que consultarte."
          onChange={(e) => onChange('phone', e.target.value)}
        />
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 font-bold">
            <input
              type="checkbox"
              checked={values.isCompany}
              onChange={(e) => onChange('isCompany', e.target.checked)}
              className="h-5 w-5 cursor-pointer accent-pink"
            />
            Compro como empresa o autónomo (para la factura)
          </label>
        </div>
        {values.isCompany && (
          <>
            <TextField
              label="Empresa"
              name="organization"
              autoComplete="organization"
              value={values.company}
              error={errors.company}
              onChange={(e) => onChange('company', e.target.value)}
            />
            <TextField
              label="NIF / CIF"
              name="taxId"
              autoComplete="off"
              value={values.taxId}
              error={errors.taxId}
              hint="Por ejemplo B12345678 o 12345678Z."
              onChange={(e) => onChange('taxId', e.target.value.toUpperCase())}
            />
          </>
        )}
      </Section>

      <Section number={2} title="Dónde lo enviamos">
        <TextField
          label="Nombre de quien recibe"
          name="shipName"
          autoComplete="shipping name"
          required
          value={values.shipName}
          error={errors['ship.name']}
          onChange={(e) => onChange('shipName', e.target.value)}
          className="sm:col-span-2"
        />
        <TextField
          label="Dirección"
          name="line1"
          autoComplete="shipping address-line1"
          required
          value={values.line1}
          error={errors['ship.line1']}
          hint="Calle y número."
          onChange={(e) => onChange('line1', e.target.value)}
          className="sm:col-span-2"
        />
        <TextField
          label="Piso, puerta, escalera (opcional)"
          name="line2"
          autoComplete="shipping address-line2"
          value={values.line2}
          error={errors['ship.line2']}
          onChange={(e) => onChange('line2', e.target.value)}
          className="sm:col-span-2"
        />
        <div>
          <TextField
            label="Código postal"
            name="postalCode"
            autoComplete="shipping postal-code"
            inputMode="numeric"
            maxLength={5}
            required
            value={values.postalCode}
            error={postalError}
            onChange={(e) => onPostalCodeChange(e.target.value)}
          />
          {zoneProblem && (
            <p className="field-hint">
              <Link href="/contacto" className="font-bold text-violet-deep underline">
                Escríbenos
              </Link>{' '}
              y buscamos la mejor forma de hacértelo llegar.
            </p>
          )}
        </div>
        <TextField
          label="Localidad"
          name="city"
          autoComplete="shipping address-level2"
          required
          value={values.city}
          error={errors['ship.city']}
          onChange={(e) => onChange('city', e.target.value)}
        />
        <SelectField
          label="Provincia"
          name="province"
          autoComplete="shipping address-level1"
          required
          value={values.province}
          error={errors['ship.province']}
          hint="Se rellena sola con tu código postal."
          onChange={(e) => onChange('province', e.target.value)}
          className="sm:col-span-2"
        >
          <option value="">Elige provincia</option>
          {DELIVERABLE_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Nota para el pedido (opcional)"
          name="note"
          value={values.note}
          error={errors.note}
          hint="Por ejemplo, horario de entrega o algo que debamos tener en cuenta con el diseño."
          maxLength={500}
          onChange={(e) => onChange('note', e.target.value)}
          className="sm:col-span-2"
        />
      </Section>

      <section className="card p-5 sm:p-6" aria-labelledby="sec-3">
        <h2 id="sec-3" className="flex items-center gap-3 text-2xl">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-yellow font-display text-lg">
            3
          </span>
          Antes de pagar
        </h2>
        <div className="mt-5 space-y-4">
          <Consent id="terms" checked={values.terms} error={errors.terms} onChange={(c) => onChange('terms', c)}>
            He leído y acepto las <ExternalLink href="/legal/condiciones">condiciones de venta</ExternalLink>.
          </Consent>
          <Consent id="privacy" checked={values.privacy} error={errors.privacy} onChange={(c) => onChange('privacy', c)}>
            Acepto el tratamiento de mis datos según la{' '}
            <ExternalLink href="/legal/privacidad">política de privacidad</ExternalLink>.
          </Consent>
          <Consent id="noWithdrawal" checked={values.noWithdrawal} error={errors.noWithdrawal} onChange={(c) => onChange('noWithdrawal', c)}>
            Entiendo que los productos personalizados no admiten desistimiento, salvo defecto.
          </Consent>
          <Consent id="artworkRights" checked={values.artworkRights} error={errors.artworkRights} onChange={(c) => onChange('artworkRights', c)}>
            Tengo derecho a usar los diseños, textos e imágenes que he subido.
          </Consent>
        </div>
      </section>
    </div>
  )
}
