/** Utilidades para leer y construir parámetros de búsqueda de las listas del panel. */

export type SearchParams = Record<string, string | string[] | undefined>

/** Primer valor de un parámetro (Next entrega un array si se repite). */
export function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function positiveInt(value: string | string[] | undefined, fallback = 1): number {
  const n = Number(one(value))
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : fallback
}

/** Construye una URL con los parámetros que tengan valor (los vacíos se omiten). */
export function hrefWith(path: string, params: Record<string, string | number | null | undefined | false>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false || value === '') continue
    qs.set(key, String(value))
  }
  const text = qs.toString()
  return text ? `${path}?${text}` : path
}

/** Páginas visibles en la paginación: primera, última y un entorno de la actual ("…" como null). */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p))
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
}
