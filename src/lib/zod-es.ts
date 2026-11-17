/**
 * Mensajes de error de zod en español (tuteo) para todo lo que no tiene un mensaje propio.
 * Sin esto, el cliente vería textos técnicos en inglés ("Invalid input: expected object, received undefined").
 * Basta con importar este módulo (efecto lateral) en los archivos que definen esquemas.
 */
import { z } from 'zod'

z.config({
  localeError: (issue) => {
    switch (issue.code) {
      case 'invalid_type':
        return issue.input === undefined || issue.input === null ? 'Falta este dato' : 'Dato no válido'
      case 'invalid_value':
        return 'Elige una opción válida'
      case 'too_big': {
        const max = String(issue.maximum)
        if (issue.origin === 'string') return `Máximo ${max} caracteres`
        if (issue.origin === 'array' || issue.origin === 'set') return `Máximo ${max} elementos`
        return `Debe ser ${issue.inclusive ? 'como máximo' : 'menor que'} ${max}`
      }
      case 'too_small': {
        const min = String(issue.minimum)
        if (issue.origin === 'string') return issue.minimum === 1 ? 'Campo obligatorio' : `Mínimo ${min} caracteres`
        if (issue.origin === 'array' || issue.origin === 'set') return `Elige al menos ${min}`
        return `Debe ser ${issue.inclusive ? 'al menos' : 'mayor que'} ${min}`
      }
      case 'invalid_format':
        return issue.format === 'email' ? 'Introduce un email válido' : 'Formato no válido'
      default:
        return 'Dato no válido'
    }
  },
})
