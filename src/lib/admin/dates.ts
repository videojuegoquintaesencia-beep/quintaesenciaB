/**
 * Fechas del panel: siempre en la hora de España peninsular, con independencia de la zona horaria del servidor.
 */
import { SPAIN_TIME_ZONE as TZ } from '@/lib/format'

const dateFmt = new Intl.DateTimeFormat('es-ES', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const shortFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
/** "2026-11-16 12:30": ordenable y reconocido por las hojas de cálculo. */
const sortableFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
const longDayFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const relativeFmt = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function adminDate(iso: string | null | undefined): string {
  const d = parse(iso)
  return d ? dateFmt.format(d) : '—'
}

export function adminDateTime(iso: string | null | undefined): string {
  const d = parse(iso)
  return d ? dateTimeFmt.format(d) : '—'
}

/** Sin año: para listas donde lo reciente importa más ("16 nov, 12:30"). */
export function adminShortDateTime(iso: string | null | undefined): string {
  const d = parse(iso)
  return d ? shortFmt.format(d) : '—'
}

export function csvDateTime(iso: string | null | undefined): string {
  const d = parse(iso)
  return d ? sortableFmt.format(d) : ''
}

/** "Lunes, 16 de noviembre" */
export function todayLabel(now = new Date()): string {
  const text = longDayFmt.format(now)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "hace 5 minutos", "ayer", "hace 3 días" (a partir de una semana, la fecha). */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  const d = parse(iso)
  if (!d) return '—'
  const diffSec = Math.round((d.getTime() - now) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return 'ahora mismo'
  if (abs < 3600) return relativeFmt.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return relativeFmt.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 7 * 86400) return relativeFmt.format(Math.round(diffSec / 86400), 'day')
  return dateFmt.format(d)
}

/** Fecha límite de un presupuesto ("2026-12-20") → "20 dic 2026". */
export function formatDeadline(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—'
  // Mediodía UTC: evita que la zona horaria desplace el día.
  return dateFmt.format(new Date(`${value}T12:00:00Z`))
}
