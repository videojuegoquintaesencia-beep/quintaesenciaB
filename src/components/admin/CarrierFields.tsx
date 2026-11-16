'use client'

import { useId } from 'react'

const CARRIERS = ['Correos', 'Correos Express', 'SEUR', 'MRW', 'GLS', 'DHL', 'UPS', 'Entrega en mano']

/** Transportista (con sugerencias, se puede escribir otro) y código de seguimiento. */
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
  return (
    <div className="grid gap-3">
      <div>
        <label htmlFor={`${id}-carrier`} className="label">
          Transportista
        </label>
        <input
          id={`${id}-carrier`}
          className="input"
          list={`${id}-carriers`}
          value={carrier}
          maxLength={60}
          autoComplete="off"
          onChange={(e) => onCarrier(e.target.value)}
        />
        <datalist id={`${id}-carriers`}>
          {CARRIERS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
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
        />
      </div>
    </div>
  )
}
