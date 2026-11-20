'use client'

import { Building2 } from 'lucide-react'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { isPlaceholderValue } from '@/config/site'
import { cn } from '@/lib/cn'
import { SETTINGS_SECTION_LABEL, businessSchema, type BusinessSettings } from '@/lib/settings-schema'
import { Panel } from '../Panel'
import { PlaceholderHint, SettingsFormActions, placeholderFieldClass } from './SettingsFormActions'
import { useSettingsSection } from './useSettingsSection'

/** Formulario de los datos del titular (aviso legal, privacidad, facturas y emails). Envía la sección completa. */
export function BusinessSettingsForm({ initial, overridden }: { initial: BusinessSettings; overridden: boolean }) {
  const form = useSettingsSection({ section: 'business', initial, schema: businessSchema })
  const { values, errors, setField } = form
  const placeholder = (value: string) => isPlaceholderValue(value)

  return (
    <Panel title="Datos del titular" id="titular" icon={<Building2 size={20} />}>
      <form onSubmit={form.save} noValidate className="space-y-5">
        <TextField
          id="business-legalName"
          label="Razón social o nombre y apellidos"
          value={values.legalName}
          maxLength={200}
          autoComplete="organization"
          onChange={(e) => setField('legalName', e.target.value)}
          error={errors.legalName}
          className={cn(placeholder(values.legalName) && placeholderFieldClass)}
          hint={
            placeholder(values.legalName) ? (
              <PlaceholderHint>Es el titular que figura en el aviso legal, la política de privacidad, el checkout y los emails.</PlaceholderHint>
            ) : (
              'Titular de la web en el aviso legal (art. 10 LSSI-CE), responsable del tratamiento en la política de privacidad y en la información básica del checkout; también va en el pie de todos los emails.'
            )
          }
        />
        <TextField
          id="business-taxId"
          label="NIF / CIF"
          value={values.taxId}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => setField('taxId', e.target.value.toUpperCase())}
          error={errors.taxId}
          className={cn(placeholder(values.taxId) && placeholderFieldClass)}
          hint={
            placeholder(values.taxId) ? (
              <PlaceholderHint>Sin NIF/CIF real el aviso legal y las facturas no son válidos.</PlaceholderHint>
            ) : (
              'Obligatorio en el aviso legal y en las facturas que emitas a tus clientes.'
            )
          }
        />
        <TextField
          id="business-registeredAddress"
          label="Domicilio fiscal"
          value={values.registeredAddress}
          maxLength={300}
          autoComplete="street-address"
          onChange={(e) => setField('registeredAddress', e.target.value)}
          error={errors.registeredAddress}
          className={cn(placeholder(values.registeredAddress) && placeholderFieldClass)}
          hint={
            placeholder(values.registeredAddress) ? (
              <PlaceholderHint>Se publica en el aviso legal y va en las facturas y los emails.</PlaceholderHint>
            ) : (
              'Dirección del titular a efectos legales y fiscales (aviso legal, facturas y pie de los emails). La dirección pública del taller se pone en «Contacto y redes».'
            )
          }
        />
        <TextField
          id="business-registry"
          label="Datos registrales"
          value={values.registry}
          maxLength={300}
          onChange={(e) => setField('registry', e.target.value)}
          error={errors.registry}
          hint="Obligatorios si el titular es una sociedad, p. ej. «Registro Mercantil de Madrid, Tomo 1234, Folio 56, Hoja M-78901». Si eres autónoma, déjalo vacío y no se mostrará."
        />
        <TextAreaField
          id="business-processors"
          label="Proveedores que tratan datos"
          value={values.processors}
          maxLength={2000}
          rows={3}
          onChange={(e) => setField('processors', e.target.value)}
          error={errors.processors}
          className={cn(placeholder(values.processors) && placeholderFieldClass)}
          hint={
            placeholder(values.processors) ? (
              <PlaceholderHint>La política de privacidad debe nombrar a estos encargados del tratamiento.</PlaceholderHint>
            ) : (
              'Quién aloja la web, la base de datos y el correo, y en qué país almacenan los datos. Se publica tal cual en la política de privacidad (apartado de transferencias internacionales), p. ej. «Vercel Inc. (EE. UU.), Turso (UE) y Resend (EE. UU.)».'
            )
          }
        />
        <SettingsFormActions
          dirty={form.dirty}
          busy={form.busy}
          notice={form.notice}
          overridden={overridden}
          confirmingReset={form.confirmingReset}
          onConfirmReset={form.setConfirmingReset}
          onReset={form.reset}
          sectionLabel={SETTINGS_SECTION_LABEL.business}
        />
      </form>
    </Panel>
  )
}
