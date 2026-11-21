'use client'

import { AtSign } from 'lucide-react'
import { TextField } from '@/components/ui/Field'
import { isPlaceholderValue } from '@/config/site'
import { cn } from '@/lib/cn'
import { SETTINGS_SECTION_LABEL, contactSchema, type ContactSettings } from '@/lib/settings-schema'
import { Panel } from '../Panel'
import { PlaceholderHint, SettingsFormActions, placeholderFieldClass } from './SettingsFormActions'
import { useSettingsSection } from './useSettingsSection'

/** Formulario de los datos de contacto públicos y redes. Envía la sección completa; un campo vacío se oculta en la web. */
export function ContactSettingsForm({ initial, overridden }: { initial: ContactSettings; overridden: boolean }) {
  const form = useSettingsSection({ section: 'contact', initial, schema: contactSchema })
  const { values, errors, setField } = form
  const emailIsPlaceholder = isPlaceholderValue(values.email)

  return (
    <Panel title="Contacto y redes" id="contacto" icon={<AtSign size={20} />}>
      <form onSubmit={form.save} noValidate className="space-y-5">
        <TextField
          id="contact-email"
          label="Email de la tienda"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          maxLength={254}
          onChange={(e) => setField('email', e.target.value)}
          error={errors.email}
          className={cn(emailIsPlaceholder && placeholderFieldClass)}
          hint={
            emailIsPlaceholder ? (
              <PlaceholderHint>El dominio .example no recibe correo: los clientes no podrían escribirte.</PlaceholderHint>
            ) : (
              'Se muestra en la web y en los emails, es la dirección a la que responden los clientes y, si no defines ADMIN_NOTIFY_EMAIL, recibe los avisos de pedidos, presupuestos y mensajes.'
            )
          }
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="contact-phone"
            label="Teléfono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            maxLength={40}
            onChange={(e) => setField('phone', e.target.value)}
            error={errors.phone}
            hint="Tal como quieras mostrarlo, p. ej. «612 345 678». Vacío: no se muestra."
          />
          <TextField
            id="contact-whatsapp"
            label="WhatsApp"
            inputMode="numeric"
            autoComplete="off"
            value={values.whatsapp}
            maxLength={20}
            onChange={(e) => setField('whatsapp', e.target.value)}
            error={errors.whatsapp}
            hint="Solo dígitos, con el prefijo del país y sin «+» ni espacios: 34612345678. Con número aparece el botón flotante de WhatsApp."
          />
          <TextField
            id="contact-instagram"
            label="Instagram"
            autoComplete="off"
            value={values.instagram}
            maxLength={80}
            onChange={(e) => setField('instagram', e.target.value)}
            error={errors.instagram}
            hint="Usuario (con o sin @) o la URL completa del perfil."
          />
          <TextField
            id="contact-tiktok"
            label="TikTok"
            autoComplete="off"
            value={values.tiktok}
            maxLength={80}
            onChange={(e) => setField('tiktok', e.target.value)}
            error={errors.tiktok}
            hint="Usuario (con o sin @) o la URL completa del perfil."
          />
        </div>
        <TextField
          id="contact-address"
          label="Dirección pública"
          autoComplete="street-address"
          value={values.address}
          maxLength={300}
          onChange={(e) => setField('address', e.target.value)}
          error={errors.address}
          hint="Taller o punto de recogida que quieres enseñar en la web; también es el remite de la hoja de producción. No es el domicilio fiscal (ese va en «Datos del titular»)."
        />
        <TextField
          id="contact-hours"
          label="Horario de atención"
          value={values.hours}
          maxLength={120}
          onChange={(e) => setField('hours', e.target.value)}
          error={errors.hours}
          hint="P. ej. «Lunes a viernes de 10:00 a 18:00». Aparece en el pie y en la página de contacto."
        />
        <p className="rounded-xl bg-cream px-3 py-2 text-sm text-ink-soft">
          Un campo vacío se oculta en toda la web: no se muestra ningún dato inventado. El email conviene tenerlo siempre
          relleno: sin él, la web y los emails remiten a la página de contacto y los avisos de pedidos, presupuestos y
          mensajes solo te llegan si está definida la variable <code>ADMIN_NOTIFY_EMAIL</code>.
        </p>
        <SettingsFormActions
          dirty={form.dirty}
          busy={form.busy}
          notice={form.notice}
          overridden={overridden}
          confirmingReset={form.confirmingReset}
          onConfirmReset={form.setConfirmingReset}
          onReset={form.reset}
          sectionLabel={SETTINGS_SECTION_LABEL.contact}
        />
      </form>
    </Panel>
  )
}
