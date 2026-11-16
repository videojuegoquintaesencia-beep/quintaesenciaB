'use client'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { site } from '@/config/site'
import { quoteFormSchema, type QuoteProduct } from '@/lib/quote-form'
import { ConsentField, FormAlert, FormSuccess, Honeypot, SubmitButton } from './FormParts'
import { ProductChips } from './ProductChips'
import { UploadDropzone } from './UploadDropzone'
import { useIntakeForm } from './useIntakeForm'
import { useUploads } from './useUploads'

const ID = 'quote'

interface Values {
  name: string
  company: string
  email: string
  phone: string
  products: QuoteProduct[]
  quantity: string
  deadline: string
  message: string
  consent: boolean
  website: string
}

const INITIAL: Values = {
  name: '',
  company: '',
  email: '',
  phone: '',
  products: [],
  quantity: '',
  deadline: '',
  message: '',
  consent: false,
  website: '',
}

/** Formulario de solicitud de presupuesto para empresas, equipos y eventos. */
export function QuoteForm() {
  const uploads = useUploads()
  const form = useIntakeForm<Values>({
    endpoint: '/api/quotes',
    idPrefix: ID,
    initial: INITIAL,
    schema: quoteFormSchema,
    toInput: (v) => ({ ...v, fileIds: uploads.ids }),
    preflight: () =>
      uploads.uploading
        ? 'Espera a que terminen de subirse los archivos.'
        : uploads.hasError
          ? 'Hay archivos que no se han podido subir. Quítalos o vuelve a elegirlos antes de enviar.'
          : null,
  })
  const { values, errors, setValue, status } = form
  const errorCount = Object.keys(errors).length

  if (status === 'success' && form.number) {
    return (
      <FormSuccess
        title="¡Solicitud enviada!"
        number={form.number}
        resetLabel="Enviar otra solicitud"
        onReset={() => {
          form.reset()
          uploads.clear()
        }}
      >
        Te responderemos a <strong className="[overflow-wrap:anywhere]">{values.email}</strong> en 1-2 días laborables. Te hemos
        enviado un email de confirmación.
      </FormSuccess>
    )
  }

  return (
    <form onSubmit={form.submit} noValidate className="card relative grid gap-5 p-5 sm:p-8" aria-label="Solicitud de presupuesto">
      <p className="text-sm text-ink-soft">
        Los campos con <span aria-hidden="true" className="font-bold text-pink-deep">*</span>
        <span className="sr-only">asterisco</span> son obligatorios.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${ID}-name`}
          label="Nombre y apellidos"
          required
          autoComplete="name"
          value={values.name}
          onChange={(e) => setValue('name', e.target.value)}
          error={errors.name}
        />
        <TextField
          id={`${ID}-company`}
          label="Empresa, club o evento"
          autoComplete="organization"
          value={values.company}
          onChange={(e) => setValue('company', e.target.value)}
          error={errors.company}
          hint="Opcional"
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
      </div>

      <ProductChips id={`${ID}-products`} value={values.products} error={errors.products} onChange={(next) => setValue('products', next)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${ID}-quantity`}
          label="Unidades aproximadas"
          type="number"
          inputMode="numeric"
          min={1}
          required
          value={values.quantity}
          onChange={(e) => setValue('quantity', e.target.value)}
          error={errors.quantity}
          hint="En total, entre todos los productos"
        />
        <TextField
          id={`${ID}-deadline`}
          label="Fecha en la que lo necesitas"
          type="date"
          value={values.deadline}
          onChange={(e) => setValue('deadline', e.target.value)}
          error={errors.deadline}
          hint="Opcional. Nos ayuda a planificar la producción"
        />
      </div>

      <TextAreaField
        id={`${ID}-message`}
        label="Cuéntanos qué necesitas"
        required
        rows={6}
        maxLength={2000}
        placeholder="Qué productos y colores, dónde irá el diseño, si ya tienes logo o necesitas ayuda para prepararlo…"
        value={values.message}
        onChange={(e) => setValue('message', e.target.value)}
        error={errors.message}
      />

      <UploadDropzone id={`${ID}-fileIds`} uploads={uploads} error={errors.fileIds} />

      <ConsentField
        id={`${ID}-consent`}
        checked={values.consent}
        error={errors.consent}
        onChange={(checked) => setValue('consent', checked)}
        purpose="responder a mi solicitud de presupuesto"
      />

      <Honeypot value={values.website} onChange={(v) => setValue('website', v)} />

      {form.formError && <FormAlert>{form.formError}</FormAlert>}
      {errorCount > 0 && !form.formError && (
        <p role="alert" className="font-bold text-danger">
          {errorCount === 1 ? 'Hay 1 campo que revisar.' : `Hay ${errorCount} campos que revisar.`} Te hemos llevado al primero.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton submitting={status === 'submitting'}>Enviar solicitud</SubmitButton>
        <p className="text-sm text-ink-soft">
          Respondemos en 1-2 días laborables. También puedes escribirnos a{' '}
          <a href={`mailto:${site.contact.email}`} className="font-bold text-violet-deep underline [overflow-wrap:anywhere]">
            {site.contact.email}
          </a>
          .
        </p>
      </div>
    </form>
  )
}
