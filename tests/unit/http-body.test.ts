import { describe, expect, it } from 'vitest'
import { readBodyBytes, readBodyForm, readBodyJson, readBodyText } from '@/lib/http-body'

const bytes = (s: string) => new TextEncoder().encode(s)

/**
 * Petición POST cuyo cuerpo llega en trozos por un flujo, como con `Transfer-Encoding: chunked`: sin cabecera
 * Content-Length, así que el tope solo se puede aplicar leyendo.
 */
function chunkedRequest(chunks: Uint8Array[], opts: { onCancel?: () => void; failAt?: number; headers?: Record<string, string> } = {}): Request {
  let i = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (opts.failAt !== undefined && i === opts.failAt) {
        controller.error(new Error('conexión cortada'))
        return
      }
      const chunk = chunks[i++]
      if (chunk) controller.enqueue(chunk)
      else controller.close()
    },
    cancel() {
      opts.onCancel?.()
    },
  })
  return new Request('http://pruebas.local/api', { method: 'POST', body: stream, headers: opts.headers, duplex: 'half' } as RequestInit)
}

describe('readBodyBytes', () => {
  it('concatena los trozos de un cuerpo que cabe en el tope', async () => {
    const res = await readBodyBytes(chunkedRequest([bytes('hola '), bytes('mundo')]), 100)
    expect(res).toEqual({ ok: true, value: bytes('hola mundo') })
  })

  it('devuelve el único trozo tal cual cuando el cuerpo llega de una vez', async () => {
    const res = await readBodyBytes(chunkedRequest([bytes('solo')]), 100)
    expect(res.ok && new TextDecoder().decode(res.value)).toBe('solo')
  })

  it('responde 413 y cancela el flujo en cuanto los bytes leídos superan el tope (sin Content-Length)', async () => {
    let cancelled = false
    const req = chunkedRequest([new Uint8Array(4), new Uint8Array(4), new Uint8Array(4), new Uint8Array(1000)], { onCancel: () => (cancelled = true) })
    const res = await readBodyBytes(req, 10)
    expect(res).toEqual({ ok: false, status: 413 })
    await expect.poll(() => cancelled).toBe(true)
  })

  it('el tope es inclusivo: exactamente `maxBytes` bytes se aceptan', async () => {
    const res = await readBodyBytes(chunkedRequest([new Uint8Array(5), new Uint8Array(5)]), 10)
    expect(res.ok).toBe(true)
  })

  it('rechaza con 413 sin tocar el cuerpo si Content-Length ya declara más del tope', async () => {
    // Un ReadableStream llama a `pull` nada más crearse, así que lo que se vigila es si alguien llega a pedir `req.body`.
    let bodyRequested = false
    const req = {
      headers: new Headers({ 'content-length': '999999' }),
      get body() {
        bodyRequested = true
        return new ReadableStream<Uint8Array>()
      },
    } as unknown as Request
    expect(await readBodyBytes(req, 10)).toEqual({ ok: false, status: 413 })
    expect(bodyRequested).toBe(false)
  })

  it('una petición sin cuerpo devuelve cero bytes', async () => {
    const res = await readBodyBytes(new Request('http://pruebas.local/api'), 10)
    expect(res).toEqual({ ok: true, value: new Uint8Array(0) })
  })

  it('un flujo que falla a mitad se convierte en 400, no en una excepción', async () => {
    const res = await readBodyBytes(chunkedRequest([bytes('a'), bytes('b')], { failAt: 1 }), 100)
    expect(res).toEqual({ ok: false, status: 400 })
  })
})

describe('readBodyText / readBodyJson', () => {
  it('decodifica UTF-8 y rechaza secuencias inválidas con 400', async () => {
    expect(await readBodyText(chunkedRequest([bytes('¡Hola!')]), 100)).toEqual({ ok: true, value: '¡Hola!' })
    expect(await readBodyText(chunkedRequest([new Uint8Array([0xff, 0xfe, 0x41])]), 100)).toEqual({ ok: false, status: 400 })
  })

  it('readBodyJson devuelve el valor o 400 si no es JSON, y propaga el 413', async () => {
    expect(await readBodyJson(chunkedRequest([bytes('{"a":'), bytes('1}')]), 100)).toEqual({ ok: true, value: { a: 1 } })
    expect(await readBodyJson(chunkedRequest([bytes('{a:1}')]), 100)).toEqual({ ok: false, status: 400 })
    expect(await readBodyJson(chunkedRequest([bytes('{"a":"' + 'x'.repeat(200) + '"}')]), 50)).toEqual({ ok: false, status: 413 })
  })
})

describe('readBodyForm', () => {
  const boundary = 'limite-de-pruebas'
  const multipart = (fields: Record<string, string>) =>
    Object.entries(fields)
      .map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
      .join('') + `--${boundary}--\r\n`

  it('interpreta un multipart/form-data con tope de bytes', async () => {
    const body = multipart({ kind: 'print', note: 'hola' })
    const req = chunkedRequest([bytes(body.slice(0, 20)), bytes(body.slice(20))], { headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } })
    const res = await readBodyForm(req, 1024)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.get('kind')).toBe('print')
      expect(res.value.get('note')).toBe('hola')
    }
  })

  it('exige el tipo multipart/form-data', async () => {
    const req = chunkedRequest([bytes('kind=print')], { headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    expect(await readBodyForm(req, 1024)).toEqual({ ok: false, status: 400 })
  })

  it('un formulario mayor que el tope devuelve 413', async () => {
    const body = multipart({ kind: 'x'.repeat(500) })
    const req = chunkedRequest([bytes(body)], { headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } })
    expect(await readBodyForm(req, 100)).toEqual({ ok: false, status: 413 })
  })

  it('un multipart mal formado devuelve 400', async () => {
    const req = chunkedRequest([bytes('esto no es multipart')], { headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } })
    expect(await readBodyForm(req, 1024)).toEqual({ ok: false, status: 400 })
  })
})
