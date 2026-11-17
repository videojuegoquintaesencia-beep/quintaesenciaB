/**
 * Validación de SVG subidos por clientes mediante LISTA BLANCA (no lista negra).
 *
 * Un SVG puede contener scripts, enlaces externos (rastreo), hojas de estilo con @import, etc. Buscar
 * subcadenas peligrosas se evita con facilidad (`<s:script>` con prefijo de espacio de nombres,
 * `jav&#x61;script:`...), así que aquí se recorre el documento etiqueta a etiqueta y solo se acepta:
 *  - elementos SVG de dibujo (sin script, foreignObject, animaciones ni enlaces <a>) y metadatos inertes
 *    de editores (Inkscape, RDF…) con su espacio de nombres canónico;
 *  - atributos sin manejadores `on*`, con `href` solo hacia `#id` o imágenes `data:` y `url()` solo a `#id`;
 *  - hojas de estilo sin `@import`, sin escapes CSS y sin `url()` externos;
 *  - sin DOCTYPE con subconjunto interno ni entidades, y sin instrucciones de proceso salvo `<?xml ?>`.
 * Además, /api/files sirve los SVG con una CSP "sandbox" y como descarga: son capas de defensa independientes.
 */

export type SvgCheck = { ok: true } | { ok: false; reason: string }

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Prefijos de metadatos de editores (inertes en el navegador) y su espacio de nombres canónico. */
const METADATA_NAMESPACES: Record<string, string> = {
  inkscape: 'http://www.inkscape.org/namespaces/inkscape',
  sodipodi: 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  cc: 'http://creativecommons.org/ns#',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
}

const SVG_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'textPath', 'image', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient',
  'stop', 'marker', 'switch', 'style', 'title', 'desc', 'metadata',
  'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA',
  'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence',
])

/** DOCTYPE permitido: el público de la W3C, sin subconjunto interno ([...]) ni entidades. */
const SAFE_DOCTYPE = /^<!doctype\s+svg(\s+public\s+"[^"]*"\s+"http:\/\/www\.w3\.org\/[^"]*")?\s*>$/i

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/** Decodifica referencias de caracteres (`&#x61;`, `&#97;`, `&amp;`...) para ver lo que verá el navegador. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1].toLowerCase() === 'x' ? Number.parseInt(ref.slice(2), 16) : Number.parseInt(ref.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ''
    }
    return NAMED_ENTITIES[ref.toLowerCase()] ?? m
  })
}

/** Quita espacios y caracteres de control, que los navegadores ignoran dentro de un esquema (`java\tscript:`). */
const squash = (value: string) => value.replace(/[\s\u0000-\u001f\u007f]+/g, '').toLowerCase()

/** Destinos permitidos en href y url(): ancla interna o imagen incrustada. */
function isSafeReference(target: string): boolean {
  const t = squash(target)
  return t.startsWith('#') || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(t) || /^data:(font|application\/font)[^,]*,/.test(t)
}

/** Comprueba todos los `url(...)` de un valor o de una hoja de estilo. */
function urlsAreSafe(value: string): boolean {
  const re = /url\(\s*(['"]?)([^)]*)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) if (!isSafeReference(m[2].replace(/^['"]/, ''))) return false
  return true
}

/** Hoja de estilo o atributo `style`: sin @import, sin escapes, sin expresiones y sin `url()` externos. */
function cssIsSafe(css: string): boolean {
  const text = decodeEntities(css)
  if (text.includes('\\')) return false
  const flat = squash(text)
  if (flat.includes('@import') || flat.includes('expression(') || flat.includes('javascript:') || flat.includes('vbscript:')) return false
  if (flat.includes('behavior:') || flat.includes('-moz-binding') || flat.includes('<script')) return false
  return urlsAreSafe(text)
}

const bad = (reason: string): SvgCheck => ({ ok: false, reason })

const isSpace = (c: string) => c === ' ' || c === '\n' || c === '\r' || c === '\t'

/** Valida un SVG (texto UTF-8). */
export function checkSvg(bytes: Uint8Array): SvgCheck {
  let text = new TextDecoder('utf-8').decode(bytes)
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  if (text.includes('\u0000')) return bad('El SVG debe estar codificado en UTF-8.')

  const n = text.length
  const namespaces = new Map<string, string>() // prefijo ('' = por defecto) → URI
  let i = 0
  let rootSeen = false
  let styleDepth = 0
  let css = ''

  const resolveElement = (qname: string): SvgCheck => {
    const colon = qname.indexOf(':')
    const prefix = colon === -1 ? '' : qname.slice(0, colon)
    const local = colon === -1 ? qname : qname.slice(colon + 1)
    const uri = namespaces.get(prefix)
    if (colon === -1 ? uri === undefined || uri === SVG_NS : uri === SVG_NS) {
      return SVG_ELEMENTS.has(local) ? { ok: true } : bad(`Elemento no permitido: <${qname}>.`)
    }
    if (colon !== -1 && uri !== undefined && METADATA_NAMESPACES[prefix] === uri) return { ok: true }
    return bad(`Elemento no permitido: <${qname}>.`)
  }

  while (i < n) {
    const lt = text.indexOf('<', i)
    if (lt === -1) {
      if (styleDepth > 0) css += text.slice(i)
      break
    }
    if (styleDepth > 0 && lt > i) css += text.slice(i, lt)
    i = lt

    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4)
      if (end === -1) return bad('Comentario sin cerrar.')
      i = end + 3
      continue
    }
    if (text.startsWith('<![CDATA[', i)) {
      const end = text.indexOf(']]>', i + 9)
      if (end === -1) return bad('CDATA sin cerrar.')
      if (styleDepth > 0) css += text.slice(i + 9, end)
      i = end + 3
      continue
    }
    if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2)
      if (end === -1) return bad('Instrucción sin cerrar.')
      if (!/^xml\s/i.test(text.slice(i + 2, end))) return bad('Instrucciones de proceso no permitidas.')
      i = end + 2
      continue
    }
    if (text.startsWith('<!', i)) {
      const end = text.indexOf('>', i)
      if (end === -1 || rootSeen || !SAFE_DOCTYPE.test(text.slice(i, end + 1))) return bad('DOCTYPE o entidades no permitidas.')
      i = end + 1
      continue
    }

    // Etiqueta de apertura, cierre o autocierre
    let j = i + 1
    const closing = text[j] === '/'
    if (closing) j++
    const nameStart = j
    while (j < n && !isSpace(text[j]) && text[j] !== '/' && text[j] !== '>') j++
    const qname = text.slice(nameStart, j)
    if (!/^[A-Za-z_][\w.-]*(:[A-Za-z_][\w.-]*)?$/.test(qname)) return bad('Etiqueta mal formada.')

    const attrs: [string, string][] = []
    let selfClosing = false
    for (;;) {
      while (j < n && isSpace(text[j])) j++
      if (j >= n) return bad('Etiqueta sin cerrar.')
      if (text[j] === '>') break
      if (text[j] === '/' && text[j + 1] === '>') {
        selfClosing = true
        j++
        break
      }
      if (closing) return bad('Etiqueta de cierre mal formada.')
      const attrStart = j
      while (j < n && !isSpace(text[j]) && text[j] !== '=' && text[j] !== '/' && text[j] !== '>') j++
      const attrName = text.slice(attrStart, j)
      if (!/^[A-Za-z_][\w.-]*(:[A-Za-z_][\w.-]*)?$/.test(attrName)) return bad('Atributo mal formado.')
      while (j < n && isSpace(text[j])) j++
      if (text[j] !== '=') return bad('Atributo sin valor.')
      j++
      while (j < n && isSpace(text[j])) j++
      const quote = text[j]
      if (quote !== '"' && quote !== "'") return bad('Atributo sin comillas.')
      const end = text.indexOf(quote, j + 1)
      if (end === -1) return bad('Atributo sin cerrar.')
      const value = text.slice(j + 1, end)
      if (value.includes('<')) return bad('Atributo mal formado.')
      attrs.push([attrName, value])
      j = end + 1
    }
    i = j + 1

    if (closing) {
      if (qname.endsWith('style') && styleDepth > 0) {
        styleDepth--
        if (styleDepth === 0) {
          if (!cssIsSafe(css)) return bad('La hoja de estilo contiene reglas no permitidas.')
          css = ''
        }
      }
      continue
    }

    // 1) Espacios de nombres declarados en esta etiqueta (valen para ella misma).
    for (const [name, rawValue] of attrs) {
      if (name !== 'xmlns' && !name.startsWith('xmlns:')) continue
      const prefix = name === 'xmlns' ? '' : name.slice(6)
      const uri = decodeEntities(rawValue)
      if (prefix === '' && uri !== SVG_NS) return bad('Espacio de nombres por defecto no permitido.')
      const previous = namespaces.get(prefix)
      if (previous !== undefined && previous !== uri) return bad('Prefijo de espacio de nombres ambiguo.')
      namespaces.set(prefix, uri)
    }

    // 2) El elemento.
    const element = resolveElement(qname)
    if (!element.ok) return element
    const local = qname.slice(qname.indexOf(':') + 1)
    if (!rootSeen) {
      if (local !== 'svg') return bad('El archivo no empieza por <svg>.')
      rootSeen = true
    }

    // 3) Los atributos.
    for (const [name, rawValue] of attrs) {
      if (name === 'xmlns' || name.startsWith('xmlns:')) continue
      const attrLocal = name.slice(name.indexOf(':') + 1).toLowerCase()
      const value = decodeEntities(rawValue)
      if (attrLocal.startsWith('on')) return bad(`Atributo de evento no permitido: ${name}.`)
      if (name === 'xml:base') return bad('xml:base no permitido.')
      if (attrLocal === 'href' && !isSafeReference(value)) return bad('Enlace externo no permitido.')
      if (attrLocal === 'style' && !cssIsSafe(value)) return bad('Estilo no permitido.')
      const flat = squash(value)
      if (flat.includes('javascript:') || flat.includes('vbscript:') || flat.includes('data:text/html') || flat.includes('<script'))
        return bad('Valor no permitido.')
      if (flat.includes('url(') && !urlsAreSafe(value)) return bad('Referencia externa no permitida.')
    }

    if (!selfClosing && local === 'style') styleDepth++
  }

  if (!rootSeen) return bad('El archivo no es un SVG.')
  if (styleDepth > 0) return bad('Etiqueta <style> sin cerrar.')
  return { ok: true }
}
