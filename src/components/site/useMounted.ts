'use client'
import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * false en el servidor y durante la hidratación; true en cuanto el cliente ya ha hidratado.
 * Sirve para mostrar datos que solo existen en el navegador (carrito en localStorage)
 * sin provocar desajustes de hidratación.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
