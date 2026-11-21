import { describe, expect, it } from 'vitest'
import { checkSvg } from '@/lib/svg-safety'

const check = (svg: string) => checkSvg(new TextEncoder().encode(svg))
const SVG = 'xmlns="http://www.w3.org/2000/svg"'

describe('checkSvg acepta', () => {
  it('un SVG simple con formas básicas', () => {
    expect(check(`<svg ${SVG} viewBox="0 0 10 10"><rect width="10" height="10" fill="#f00"/><circle cx="5" cy="5" r="2"/></svg>`)).toEqual({ ok: true })
  })

  it('declaración XML, BOM, comentarios, DOCTYPE público y espacios de nombres de editores', () => {
    const svg = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>
<!-- Creado con Inkscape -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg ${SVG} xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cc="http://creativecommons.org/ns#" viewBox="0 0 100 100">
  <metadata><rdf:RDF><cc:Work rdf:about=""/></rdf:RDF></metadata>
  <g inkscape:label="Capa 1" inkscape:groupmode="layer"><path d="M0 0 L100 100" stroke="#000"/></g>
</svg>`
    expect(check(svg)).toEqual({ ok: true })
  })

  it('hojas de estilo inofensivas (también dentro de CDATA) y estilos en línea', () => {
    expect(check(`<svg ${SVG}><style>.a{fill:red;stroke:#000}</style><rect class="a" width="1" height="1"/></svg>`)).toEqual({ ok: true })
    expect(check(`<svg ${SVG}><style><![CDATA[ .b { fill: url(#grad) } ]]></style><rect class="b" width="1" height="1"/></svg>`)).toEqual({ ok: true })
    expect(check(`<svg ${SVG}><rect style="fill:#0f0;opacity:.5" width="1" height="1"/></svg>`)).toEqual({ ok: true })
  })

  it('referencias internas (#id) y imágenes incrustadas en data:', () => {
    expect(check(`<svg ${SVG} xmlns:xlink="http://www.w3.org/1999/xlink"><defs><circle id="c" r="1"/></defs><use href="#c"/><use xlink:href="#c"/></svg>`)).toEqual({ ok: true })
    expect(check(`<svg ${SVG}><image href="data:image/png;base64,iVBORw0KGgo=" width="1" height="1"/></svg>`)).toEqual({ ok: true })
    expect(check(`<svg ${SVG}><rect fill="url(#g)" width="1" height="1"/></svg>`)).toEqual({ ok: true })
  })

  it('filtros y degradados', () => {
    expect(
      check(
        `<svg ${SVG}><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="2"/></filter></defs><rect filter="url(#f)" fill="url(#g)" width="1" height="1"/></svg>`,
      ),
    ).toEqual({ ok: true })
  })
})

describe('checkSvg rechaza', () => {
  it.each<[string, string, string]>([
    ['scripts', `<svg ${SVG}><script>alert(1)</script></svg>`, 'Elemento no permitido: <script>.'],
    ['scripts con prefijo del espacio de nombres SVG', `<svg ${SVG} xmlns:svg="http://www.w3.org/2000/svg"><svg:script>alert(1)</svg:script></svg>`, 'Elemento no permitido: <svg:script>.'],
    ['elementos de espacios de nombres desconocidos', `<svg ${SVG} xmlns:s="http://evil.example/ns"><s:script>alert(1)</s:script></svg>`, 'Elemento no permitido: <s:script>.'],
    ['enlaces <a>', `<svg ${SVG}><a href="#x"><rect width="1" height="1"/></a></svg>`, 'Elemento no permitido: <a>.'],
    ['foreignObject', `<svg ${SVG}><foreignObject><div>hola</div></foreignObject></svg>`, 'Elemento no permitido: <foreignObject>.'],
    ['animaciones', `<svg ${SVG}><rect width="1" height="1"><animate attributeName="x" to="1"/></rect></svg>`, 'Elemento no permitido: <animate>.'],
    ['manejadores de eventos', `<svg ${SVG} onload="alert(1)"><rect width="1" height="1"/></svg>`, 'Atributo de evento no permitido: onload.'],
    ['manejadores en mayúsculas', `<svg ${SVG}><rect width="1" height="1" OnClick="alert(1)"/></svg>`, 'Atributo de evento no permitido: OnClick.'],
    ['href externos', `<svg ${SVG}><image href="https://evil.example/pixel.gif"/></svg>`, 'Enlace externo no permitido.'],
    ['xlink:href con javascript:', `<svg ${SVG} xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="javascript:alert(1)"/></svg>`, 'Enlace externo no permitido.'],
    ['javascript: disfrazado con entidades y tabuladores', `<svg ${SVG}><use href="jav&#x61;scr\tipt:alert(1)"/></svg>`, 'Enlace externo no permitido.'],
    ['data: que no sean imágenes', `<svg ${SVG}><use href="data:text/html,hola"/></svg>`, 'Enlace externo no permitido.'],
    ['@import en hojas de estilo', `<svg ${SVG}><style>@import url("https://evil.example/x.css");</style></svg>`, 'La hoja de estilo contiene reglas no permitidas.'],
    ['@import dentro de CDATA', `<svg ${SVG}><style><![CDATA[ @import url(x) ]]></style></svg>`, 'La hoja de estilo contiene reglas no permitidas.'],
    ['escapes CSS (ocultan palabras clave)', `<svg ${SVG}><style>.a{content:"\\41"}</style></svg>`, 'La hoja de estilo contiene reglas no permitidas.'],
    ['url() externos en estilos en línea', `<svg ${SVG}><rect style="fill:url(http://evil.example/x)" width="1" height="1"/></svg>`, 'Estilo no permitido.'],
    ['url() externos en atributos de presentación', `<svg ${SVG}><rect fill="url(http://evil.example/x)" width="1" height="1"/></svg>`, 'Referencia externa no permitida.'],
    ['valores con data:text/html', `<svg ${SVG}><rect title="data:text/html,x" width="1" height="1"/></svg>`, 'Valor no permitido.'],
    ['xml:base', `<svg ${SVG} xml:base="https://evil.example/"><rect width="1" height="1"/></svg>`, 'xml:base no permitido.'],
    ['DOCTYPE con entidades', `<!DOCTYPE svg [<!ENTITY x "y">]><svg ${SVG}/>`, 'DOCTYPE o entidades no permitidas.'],
    ['instrucciones de proceso que no sean <?xml ?>', `<?xml version="1.0"?><?php echo 1 ?><svg ${SVG}/>`, 'Instrucciones de proceso no permitidas.'],
    ['un documento que no empieza por <svg>', `<html><body>hola</body></html>`, 'Elemento no permitido: <html>.'],
    ['un espacio de nombres por defecto distinto de SVG', `<svg xmlns="http://www.w3.org/1999/xhtml"><rect/></svg>`, 'Espacio de nombres por defecto no permitido.'],
    ['un prefijo redeclarado con otra URI', `<svg ${SVG} xmlns:a="http://a.example"><g xmlns:a="http://b.example"/></svg>`, 'Prefijo de espacio de nombres ambiguo.'],
    ['atributos sin comillas', `<svg ${SVG}><rect width=10 height="1"/></svg>`, 'Atributo sin comillas.'],
    ['atributos sin valor', `<svg ${SVG}><rect hidden width="1" height="1"/></svg>`, 'Atributo sin valor.'],
    ['etiquetas sin cerrar', `<svg ${SVG}><rect`, 'Etiqueta sin cerrar.'],
    ['comentarios sin cerrar', `<svg ${SVG}><!-- hola`, 'Comentario sin cerrar.'],
    ['<style> sin cerrar', `<svg ${SVG}><style>.a{}`, 'Etiqueta <style> sin cerrar.'],
    ['texto que no es SVG', 'hola, esto no es un SVG', 'El archivo no es un SVG.'],
    ['bytes nulos (no es UTF-8 válido)', `<svg ${SVG}>\u0000</svg>`, 'El SVG debe estar codificado en UTF-8.'],
  ])('%s', (_name, svg, reason) => {
    expect(check(svg)).toEqual({ ok: false, reason })
  })

  it('un <svg> raíz que no es el primer elemento también se rechaza', () => {
    expect(check(`<g><svg ${SVG}/></g>`)).toEqual({ ok: false, reason: 'El archivo no empieza por <svg>.' })
  })
})
