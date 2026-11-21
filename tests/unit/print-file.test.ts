import { describe, expect, it } from 'vitest'
import { MAX_PRINT_PIXELS, MIN_PRINT_DPI, PRINT_DPI } from '@/lib/editor/constants'
import { printFileMatchesBox, printRenderSize, printRenderSizeAt } from '@/lib/print-file'

describe('printRenderSize', () => {
  it('a 300 ppp, 10 × 10 cm son 1182 × 1182 px (redondeo hacia arriba)', () => {
    expect(printRenderSize(10, 10)).toEqual({ dpi: PRINT_DPI, widthPx: 1182, heightPx: 1182 })
  })

  it('la zona más grande de la camiseta (30 × 40 cm) cabe justa a 300 ppp', () => {
    const size = printRenderSize(30, 40)
    expect(size.dpi).toBe(300)
    expect(size.widthPx).toBe(3544)
    expect(size.heightPx).toBe(4725)
    expect(size.widthPx * size.heightPx).toBeLessThanOrEqual(MAX_PRINT_PIXELS)
  })

  it('la espalda de la sudadera (32 × 40 cm) baja los ppp hasta respetar el tope de píxeles', () => {
    const size = printRenderSize(32, 40)
    expect(size.dpi).toBe(290)
    expect(size.widthPx).toBe(3654)
    expect(size.heightPx).toBe(4567)
    expect(size.widthPx * size.heightPx).toBeLessThanOrEqual(MAX_PRINT_PIXELS)
  })

  it('nunca baja de 150 ppp aunque entonces supere el tope de píxeles', () => {
    const size = printRenderSize(100, 100)
    expect(size.dpi).toBe(MIN_PRINT_DPI)
    expect(size.widthPx * size.heightPx).toBeGreaterThan(MAX_PRINT_PIXELS)
  })

  it('printRenderSizeAt no devuelve nunca menos de 1 px', () => {
    expect(printRenderSizeAt(0.001, 0.001, 300)).toEqual({ dpi: 300, widthPx: 1, heightPx: 1 })
  })
})

describe('printFileMatchesBox', () => {
  it('acepta el tamaño exacto a 300 ppp', () => {
    expect(printFileMatchesBox({ width: 1182, height: 1182 }, 10, 10)).toBe(true)
  })

  it('acepta cualquier resolución uniforme entre 150 y 300 ppp (el editor baja los ppp en fotos grandes)', () => {
    expect(printFileMatchesBox({ width: 591, height: 591 }, 10, 10)).toBe(true) // 150 ppp
    expect(printFileMatchesBox({ width: 867, height: 867 }, 10, 10)).toBe(true) // 220 ppp
    expect(printFileMatchesBox({ width: 1182, height: 296 }, 20, 5)).toBe(true) // 150 ppp, caja rectangular
  })

  it('rechaza un archivo por debajo de 150 ppp', () => {
    expect(printFileMatchesBox({ width: 100, height: 100 }, 10, 10)).toBe(false)
  })

  it('rechaza una resolución distinta por eje (el archivo está deformado o recortado)', () => {
    expect(printFileMatchesBox({ width: 1182, height: 591 }, 10, 10)).toBe(false)
  })

  it('rechaza un archivo mucho mayor que la caja cobrada (declarar pequeño e imprimir grande)', () => {
    expect(printFileMatchesBox({ width: 2000, height: 2000 }, 10, 10)).toBe(false)
    expect(printFileMatchesBox({ width: 3544, height: 4725 }, 10, 10)).toBe(false)
  })

  it('tolera 2 px o el 1,5 % por eje, lo que sea mayor', () => {
    expect(printFileMatchesBox({ width: 1184, height: 1180 }, 10, 10)).toBe(true)
    expect(printFileMatchesBox({ width: 1182, height: 1199 }, 10, 10)).toBe(true) // +17 px ≈ 1,4 %
    expect(printFileMatchesBox({ width: 1182, height: 1203 }, 10, 10)).toBe(false) // +21 px ≈ 1,8 %
    // Cajas pequeñas: 2 px absolutos valen aunque sean más del 1,5 %
    expect(printFileMatchesBox({ width: 120, height: 120 }, 1, 1)).toBe(true) // 1 cm = 118,1 px
  })
})
