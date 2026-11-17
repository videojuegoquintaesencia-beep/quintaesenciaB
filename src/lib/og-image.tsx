import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { site } from '@/config/site'
import { OG_SIZE } from './og-meta'

/** Imagen para compartir en redes (1200 × 630): la comparten `opengraph-image` y `twitter-image`. */

const INK = '#1b1340'
const CREAM = '#fff8ec'

/** Tipografía de la marca (Anton) si está disponible; si no, ImageResponse usa su fuente por defecto. */
async function displayFont() {
  try {
    const data = await readFile(join(process.cwd(), 'node_modules/@fontsource/anton/files/anton-latin-400-normal.woff'))
    return [{ name: 'Anton', data, style: 'normal' as const, weight: 400 as const }]
  } catch {
    return []
  }
}

function Dot({ color, size, left, top }: { color: string; size: number; left: number; top: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        border: `6px solid ${INK}`,
        display: 'flex',
      }}
    />
  )
}

export interface OgImageText {
  /** Etiqueta rosa sobre el título. */
  kicker?: string
  title?: string
  subtitle?: string
}

export async function renderOgImage({ kicker = 'Impresión DTF · Hecho para ti', title = site.name, subtitle = site.tagline }: OgImageText = {}) {
  const fonts = await displayFont()
  const fontFamily = fonts.length > 0 ? 'Anton' : 'sans-serif'
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: CREAM,
          border: `14px solid ${INK}`,
          fontFamily,
          color: INK,
        }}
      >
        <Dot color="#ffc93c" size={150} left={640} top={40} />
        <Dot color="#12c8b4" size={96} left={1010} top={90} />
        <Dot color="#7b5cff" size={70} left={900} top={440} />
        <Dot color="#ff7a3d" size={110} left={1040} top={420} />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 70px', width: 900 }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: '#ff4f9a',
              border: `5px solid ${INK}`,
              borderRadius: 999,
              padding: '8px 28px',
              fontSize: 34,
              letterSpacing: 2,
              boxShadow: `6px 6px 0 ${INK}`,
            }}
          >
            {kicker.toUpperCase()}
          </div>
          <div style={{ display: 'flex', fontSize: title.length > 12 ? 128 : 172, lineHeight: 1.1, marginTop: 24, textTransform: 'uppercase' }}>{title}</div>
          <div style={{ display: 'flex', fontSize: 52, marginTop: 14, lineHeight: 1.15 }}>{subtitle}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  )
}
