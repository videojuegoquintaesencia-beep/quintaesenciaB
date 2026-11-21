import { describe, expect, it } from 'vitest'
import {
  areaUsage,
  designArtworkFileIds,
  emptyDesign,
  layerBounds,
  layerCount,
  parseDesign,
  printedAreaIds,
  type Design,
  type ImageLayer,
  type Layer,
  type StickerLayer,
  type TextLayer,
} from '@/lib/design'

const text = (over: Partial<TextLayer> = {}): TextLayer => ({
  id: 't1',
  type: 'text',
  x: 15,
  y: 20,
  width: 10,
  height: 10,
  rotation: 0,
  text: 'Hola',
  font: 'fredoka',
  sizeCm: 2,
  fill: '#1b1340',
  align: 'center',
  ...over,
})

const image = (over: Partial<ImageLayer> = {}): ImageLayer => ({
  id: 'i1',
  type: 'image',
  x: 15,
  y: 20,
  width: 10,
  height: 10,
  rotation: 0,
  fileId: 'abcdefghijkl',
  naturalWidth: 400,
  naturalHeight: 400,
  ...over,
})

const sticker = (over: Partial<StickerLayer> = {}): StickerLayer => ({ id: 's1', type: 'sticker', x: 5, y: 5, width: 4, height: 4, rotation: 0, stickerId: 'estrella', ...over })

function design(areas: Record<string, Layer[]>, productId: Design['productId'] = 'camiseta', colorId = 'blanco'): Design {
  return { v: 1, productId, colorId, areas: Object.fromEntries(Object.entries(areas).map(([id, layers]) => [id, { layers }])) }
}

const FRENTE = { widthCm: 30, heightCm: 40 }

describe('layerBounds', () => {
  it('sin rotación la caja es la propia capa centrada en (x, y)', () => {
    expect(layerBounds({ x: 15, y: 20, width: 10, height: 4, rotation: 0 })).toEqual({ x0: 10, y0: 18, x1: 20, y1: 22 })
  })

  it('a 90° (o −90°) intercambia ancho y alto', () => {
    const b = layerBounds({ x: 15, y: 20, width: 10, height: 4, rotation: 90 })
    expect(b.x1 - b.x0).toBeCloseTo(4, 10)
    expect(b.y1 - b.y0).toBeCloseTo(10, 10)
    const neg = layerBounds({ x: 15, y: 20, width: 10, height: 4, rotation: -90 })
    expect(neg.x1 - neg.x0).toBeCloseTo(4, 10)
  })

  it('un cuadrado a 45° ocupa una caja de lado · √2', () => {
    const b = layerBounds({ x: 0, y: 0, width: 10, height: 10, rotation: 45 })
    expect(b.x1 - b.x0).toBeCloseTo(Math.SQRT2 * 10, 10)
    expect(b.y1 - b.y0).toBeCloseTo(Math.SQRT2 * 10, 10)
  })

  it('180° es igual que 0°', () => {
    expect(layerBounds({ x: 1, y: 2, width: 3, height: 4, rotation: 180 })).toEqual(
      expect.objectContaining({ x0: expect.closeTo(-0.5, 10), x1: expect.closeTo(2.5, 10) }),
    )
  })
})

describe('areaUsage', () => {
  it('sin capas no hay superficie ni caja', () => {
    expect(areaUsage([], FRENTE)).toEqual({ usedCm2: 0, bbox: null })
  })

  it('una capa dentro de la zona usa exactamente su caja', () => {
    expect(areaUsage([text()], FRENTE)).toEqual({ usedCm2: 100, bbox: { x0: 10, y0: 15, x1: 20, y1: 25 } })
  })

  it('varias capas se cobran por la caja que las envuelve a todas, no por la suma', () => {
    const usage = areaUsage([text({ x: 5, y: 5, width: 4, height: 4 }), text({ id: 't2', x: 25, y: 35, width: 4, height: 4 })], FRENTE)
    expect(usage.bbox).toEqual({ x0: 3, y0: 3, x1: 27, y1: 37 })
    expect(usage.usedCm2).toBe(24 * 34)
  })

  it('recorta lo que sobresale de la zona y descarta lo que queda fuera', () => {
    // 20 cm de ancho centrada en x = 28: ocupa de 18 a 38, la zona termina en 30
    expect(areaUsage([text({ x: 28, y: 20, width: 20, height: 10 })], FRENTE)).toEqual({ usedCm2: 120, bbox: { x0: 18, y0: 15, x1: 30, y1: 25 } })
    // Fuera por la izquierda y por arriba
    expect(areaUsage([text({ x: -20, y: 20 })], FRENTE).usedCm2).toBe(0)
    expect(areaUsage([text({ x: 15, y: -20 })], FRENTE).usedCm2).toBe(0)
    // Justo pegada al borde exterior: ni un milímetro dentro
    expect(areaUsage([text({ x: 35, y: 20, width: 10, height: 10 })], FRENTE).usedCm2).toBe(0)
  })

  it('una capa rotada se recorta por su caja envolvente girada', () => {
    // 20 × 10 girada 90° → 10 × 20; centrada en x = 28 ocupa de 23 a 33 → dentro: 7 cm × 20 cm
    const usage = areaUsage([text({ x: 28, y: 20, width: 20, height: 10, rotation: 90 })], FRENTE)
    expect(usage.usedCm2).toBeCloseTo(140, 8)
  })

  it('mezcla capas dentro y fuera: solo cuentan las que tocan la zona', () => {
    const usage = areaUsage([text({ x: 100, y: 100 }), text({ id: 't2', x: 15, y: 20 })], FRENTE)
    expect(usage.usedCm2).toBe(100)
  })
})

describe('parseDesign', () => {
  it('acepta un diseño válido con texto, imagen y pegatina', () => {
    const d = design({ frente: [text(), image({ id: 'i1' })], pecho: [sticker()] })
    const result = parseDesign(d)
    expect(result).toEqual({ ok: true, design: d })
  })

  it('acepta un diseño sin zonas (vacío)', () => {
    expect(parseDesign(emptyDesign('taza', 'blanca')).ok).toBe(true)
  })

  it.each<[string, unknown]>([
    ['null', null],
    ['una cadena', 'diseño'],
    ['un objeto vacío', {}],
    ['otra versión del modelo', { ...design({}), v: 2 }],
    ['un producto que no existe', { ...design({}), productId: 'bolsa' }],
    ['una capa con un tipo desconocido', design({ frente: [{ ...text(), type: 'vector' } as unknown as Layer] })],
    ['una capa sin tipografía', design({ frente: [{ ...text(), font: undefined } as unknown as Layer] })],
    ['una tipografía que no existe', design({ frente: [text({ font: 'comic' as TextLayer['font'] })] })],
    ['un texto vacío', design({ frente: [text({ text: '' })] })],
    ['un texto de más de 200 caracteres', design({ frente: [text({ text: 'a'.repeat(201) })] })],
    ['un color que no es hexadecimal de 6 cifras', design({ frente: [text({ fill: '#123' })] })],
    ['una capa microscópica (menos de 1 mm)', design({ frente: [text({ width: 0.05 })] })],
    ['una rotación de más de dos vueltas', design({ frente: [text({ rotation: 800 })] })],
    ['coordenadas no finitas', design({ frente: [text({ x: Number.POSITIVE_INFINITY })] })],
    ['un id de archivo con formato inválido', design({ frente: [image({ fileId: 'NO-VALIDO' })] })],
    ['una imagen sin dimensiones naturales', design({ frente: [{ ...image(), naturalWidth: 0 }] })],
    ['más de 40 capas en una zona', design({ frente: Array.from({ length: 41 }, (_, i) => text({ id: `t${i}` })) })],
  ])('rechaza %s con un mensaje genérico', (_name, input) => {
    expect(parseDesign(input)).toEqual({ ok: false, error: 'El diseño no es válido.' })
  })

  it('rechaza un color que el producto no tiene', () => {
    expect(parseDesign(design({}, 'taza', 'blanco'))).toEqual({ ok: false, error: 'Color no disponible para este producto.' })
  })

  it('rechaza zonas de estampado que el producto no tiene', () => {
    expect(parseDesign(design({ manga: [text()] }))).toEqual({ ok: false, error: 'Zona de estampado desconocida: manga.' })
    expect(parseDesign(design({ envolvente: [text()] }))).toEqual({ ok: false, error: 'Zona de estampado desconocida: envolvente.' })
  })

  it('rechaza más de 80 capas en total aunque ninguna zona pase de 40', () => {
    const many = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => text({ id: `${prefix}${i}` }))
    expect(parseDesign(design({ frente: many('f', 40), espalda: many('e', 40), pecho: many('p', 1) }))).toEqual({ ok: false, error: 'El diseño tiene demasiados elementos.' })
    expect(parseDesign(design({ frente: many('f', 40), espalda: many('e', 40) })).ok).toBe(true)
  })

  it('no acepta propiedades con tipos equivocados aunque el valor "parezca" correcto', () => {
    expect(parseDesign(design({ frente: [{ ...text(), x: '15' } as unknown as Layer] })).ok).toBe(false)
    expect(parseDesign(design({ frente: [{ ...text(), bold: 'sí' } as unknown as Layer] })).ok).toBe(false)
  })
})

describe('utilidades del diseño', () => {
  it('layerCount suma las capas de todas las zonas', () => {
    expect(layerCount(design({ frente: [text(), text({ id: 't2' })], pecho: [sticker()] }))).toBe(3)
    expect(layerCount(design({}))).toBe(0)
  })

  it('printedAreaIds solo devuelve las zonas con algo dentro del área imprimible', () => {
    const d = design({ frente: [text()], espalda: [text({ x: 100, y: 100 })], pecho: [] })
    expect(printedAreaIds(d)).toEqual(['frente'])
  })

  it('designArtworkFileIds devuelve los archivos de imagen sin repetir', () => {
    const d = design({ frente: [image(), image({ id: 'i2' }), image({ id: 'i3', fileId: 'zyxwvutsrqpo' })], pecho: [text()] })
    expect(designArtworkFileIds(d)).toEqual(['abcdefghijkl', 'zyxwvutsrqpo'])
  })

  it('emptyDesign crea el modelo mínimo de la versión 1', () => {
    expect(emptyDesign('gorra', 'negro')).toEqual({ v: 1, productId: 'gorra', colorId: 'negro', areas: {} })
  })
})
