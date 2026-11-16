/** Carga perezosa de tipografías (solo dentro del chunk del editor). */
import { FONTS, type FontId } from '@/lib/design'

/** Fuentes que ya carga el layout raíz (Fredoka y Nunito). El resto se importa bajo demanda. */
const LOADERS: Partial<Record<FontId, () => Promise<unknown>>> = {
  anton: () => import('@fontsource/anton'),
  bangers: () => import('@fontsource/bangers'),
  pacifico: () => import('@fontsource/pacifico'),
  'permanent-marker': () => import('@fontsource/permanent-marker'),
  caveat: () => import('@fontsource/caveat'),
  lobster: () => import('@fontsource/lobster'),
  'bebas-neue': () => import('@fontsource/bebas-neue'),
}

/** Estilos disponibles de verdad en cada tipografía (negrita real solo en las variables). */
export const FONT_CAPS: Record<FontId, { bold: boolean; italic: boolean }> = {
  fredoka: { bold: true, italic: true },
  nunito: { bold: true, italic: true },
  anton: { bold: false, italic: true },
  bangers: { bold: false, italic: true },
  pacifico: { bold: false, italic: false },
  'permanent-marker': { bold: false, italic: true },
  caveat: { bold: true, italic: false },
  lobster: { bold: false, italic: false },
  'bebas-neue': { bold: false, italic: true },
}

const pending = new Map<FontId, Promise<boolean>>()

/** Carga el CSS de la fuente y espera a que el navegador la tenga lista. Devuelve false si falla. */
export function ensureFont(font: FontId, sample = 'Aa'): Promise<boolean> {
  const key = font
  const cached = pending.get(key)
  if (cached) return cached.then(() => loadFace(font, sample))
  const promise = (async () => {
    try {
      await LOADERS[font]?.()
    } catch {
      return false
    }
    return loadFace(font, sample)
  })()
  pending.set(key, promise)
  return promise
}

async function loadFace(font: FontId, sample: string): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return true
  const family = FONTS[font].family
  try {
    await Promise.all([
      document.fonts.load(`400 40px ${family}`, sample),
      FONT_CAPS[font].bold ? document.fonts.load(`700 40px ${family}`, sample) : Promise.resolve([]),
    ])
    return true
  } catch {
    return false
  }
}
