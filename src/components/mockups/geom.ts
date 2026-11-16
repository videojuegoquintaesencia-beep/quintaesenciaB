import { n } from './svg'

/** Segmento de trazado en coordenadas absolutas. */
export type Seg =
  | ['L', number, number]
  | ['Q', number, number, number, number]
  | ['C', number, number, number, number, number, number]

type Pt = [number, number]

function endOf(seg: Seg): Pt {
  return [seg[seg.length - 2] as number, seg[seg.length - 1] as number]
}

export function segsToPath(start: Pt, segs: Seg[]): string {
  return `M${n(start[0])} ${n(start[1])}${segs.map((s) => s[0] + s.slice(1).map((v) => n(v as number)).join(' ')).join('')}`
}

/**
 * Cierra una silueta simétrica: recibe la mitad izquierda (de `start` a un punto del eje x = cx)
 * y añade su reflejo recorrido a la inversa. `closing` se añade al final (p. ej. el arco del cuello).
 */
export function symmetric(start: Pt, segs: Seg[], cx: number, closing = 'Z'): string {
  const mx = (x: number) => 2 * cx - x
  const starts: Pt[] = []
  let cur = start
  for (const s of segs) {
    starts.push(cur)
    cur = endOf(s)
  }
  let d = segsToPath(start, segs)
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i]
    const from = starts[i]
    if (s[0] === 'L') d += `L${n(mx(from[0]))} ${n(from[1])}`
    else if (s[0] === 'Q') d += `Q${n(mx(s[1]))} ${n(s[2])} ${n(mx(from[0]))} ${n(from[1])}`
    else d += `C${n(mx(s[3]))} ${n(s[4])} ${n(mx(s[1]))} ${n(s[2])} ${n(mx(from[0]))} ${n(from[1])}`
  }
  return d + closing
}
