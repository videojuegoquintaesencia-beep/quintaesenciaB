'use client'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { contactMessageSchema } from '@/lib/validators'
import { ConsentField, FormAlert, FormSuccess, Honeypot, SubmitButton } from './FormParts'
import { useIntakeForm } from './useIntakeForm'

const ID = 'contact'

interface Values {
  name: string
  email: string
  phone: string
  message: string
  consent: boolean
  website: string
}

const INITIAL: Values = { name: '', email: '', phone: '', message: '', consent: false, website: '' }

/** Formulario de contacto general. `contactEmail` es el email efectivo de la tienda (ajustes del panel). */
export function ContactForm({ contactEmail }: { contactEmail: string }) {
  const form = useIntakeForm<Values>({
    endpoint: '/api/contact',
    idPrefix: ID,
    initial: INITIAL,
    schema: contactMessageSchema,
    toInput: (v) => v,
    contactEmail,
  })
  const { values, errors, setValue, status } = form
  const errorCount = Object.keys(errors).length

  if (status === 'success' && form.number) {
    return (
      <FormSuccess title="¡Mensaje enviado!" number={form.number} resetLabel="Enviar otro mensaje" onReset={form.reset}>
        Te responderemos a <strong className="[overflow-wrap:anywhere]">{values.email}</strong> en 1-2 días laborables. Te hemos
        enviado un email de confirmación.
      </FormSuccess>
    )
  }

  return (
    <form onSubmit={form.submit} noValidate className="card relative grid gap-5 p-5 sm:p-8" aria-label="Mensaje de contacto">
      <p className="text-sm text-ink-soft">
        Los campos con <span aria-hidden="true" className="font-bold text-pink-deep">*</span>
        <span className="sr-only">asterisco</span> son obligatorios.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${ID}-name`}
          label="Nombre"
          required
          autoComplete="name"
          value={values.name}
          onChange={(e) => setValue('name', e.target.value)}
          error={errors.name}
        />
        <TextField
          id={`${ID}-email`}
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValue('email', e.target.value)}
          error={errors.email}
        />
      </div>
      <TextField
        id={`${ID}-phone`}
        label="Teléfono"
        type="tel"
        autoComplete="tel"
        value={values.phone}
        onChange={(e) => setValue('phone', e.target.value)}
        error={errors.phone}
        hint="Opcional, por si es más fácil hablar"
      />
      <TextAreaField
        id={`${ID}-message`}
        label="Mensaje"
        required
        rows={6}
        maxLength={2000}
        placeholder="Cuéntanos en qué podemos ayudarte. Si es sobre un pedido, incluye tu número de pedido."
        value={values.message}
        onChange={(e) => setValue('message', e.target.value)}
        error={errors.message}
      />
      <ConsentField
        id={`${ID}-consent`}
        checked={values.consent}
        error={errors.consent}
        onChange={(checked) => setValue('consent', checked)}
        purpose="responder a mi mensaje"
      />
      <Honeypot value={values.website} onChange={(v) => setValue('website', v)} />

      {form.formError && <FormAlert>{form.formError}</FormAlert>}
      {errorCount > 0 && !form.formError && (
        <p role="alert" className="font-bold text-danger">
          {errorCount === 1 ? 'Hay 1 campo que revisar.' : `Hay ${errorCount} campos que revisar.`} Te hemos llevado al primero.
        </p>
      )}

      <div>
        <SubmitButton submitting={status === 'submitting'}>Enviar mensaje</SubmitButton>
      </div>
    </form>
  )
}
