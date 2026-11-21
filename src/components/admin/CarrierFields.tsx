'use client'

import { useId, useState } from 'react'
import { CARRIERS, OTHER_CARRIER, findCarrier } from '@/lib/carriers'

/**
 * Transportista (lista con enlace de seguimiento conocido, o "Otro" para escribirlo) y código de seguimiento.
 * El valor que se guarda sigue siendo un texto (el nombre del transportista), así que los pedidos antiguos y los
 * transportistas escritos a mano siguen valiendo.
 */
export function CarrierFields({
  carrier,
  tracking,
  onCarrier,
  onTracking,
  trackingRequired,
}: {
  carrier: string
  tracking: string
  onCarrier: (value: string) => void
  onTracking: (value: string) => void
  trackingRequired?: boolean
}) {
  const id = useId()
  // "Otro" se mantiene elegido mientras se escribe, aunque el texto esté vacío o coincida con uno de la lista.
  const [other, setOther] = useState(() => carrier.trim() !== '' && !findCarrier(carrier))
  const known = findCarrier(carrier)
  const selectValue = other ? OTHER_CARRIER : (known?.name ?? '')
  const noTracking = !other && known?.trackingUrl === null

  function chooseCarrier(value: string) {
    if (value === OTHER_CARRIER) {
      setOther(true)
      onCarrier('')
      return
    }
    setOther(false)
    onCarrier(value)
  }

  return (
    <div className="grid gap-3">
      <div>
        <label htmlFor={`${id}-carrier`} className="label">
          Transportista
        </label>
        <select id={`${id}-carrier`} className="select" value={selectValue} onChange={(e) => chooseCarrier(e.target.value)}>
          <option value="">Elige el transportista</option>
          {CARRIERS.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
          <option value={OTHER_CARRIER}>{OTHER_CARRIER}</option>
        </select>
      </div>
      {other && (
        <div>
          <label htmlFor={`${id}-carrier-other`} className="label">
            Nombre del transportista
          </label>
          <input
            id={`${id}-carrier-other`}
            className="input"
            value={carrier}
            maxLength={60}
            autoComplete="off"
            onChange={(e) => onCarrier(e.target.value)}
            aria-describedby={`${id}-carrier-other-hint`}
          />
          <p id={`${id}-carrier-other-hint`} className="field-hint">
            Con un transportista que no está en la lista, el cliente verá el código pero sin enlace de seguimiento.
          </p>
        </div>
      )}
      <div>
        <label htmlFor={`${id}-tracking`} className="label">
          Código de seguimiento
        </label>
        <input
          id={`${id}-tracking`}
          className="input"
          value={tracking}
          maxLength={80}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required={trackingRequired}
          onChange={(e) => onTracking(e.target.value)}
          aria-describedby={noTracking ? `${id}-tracking-hint` : undefined}
        />
        {noTracking && (
          <p id={`${id}-tracking-hint`} className="field-hint">
            La entrega en mano no tiene seguimiento en línea: puedes dejarlo vacío o anotar una referencia propia.
          </p>
        )}
      </div>
    </div>
  )
}
