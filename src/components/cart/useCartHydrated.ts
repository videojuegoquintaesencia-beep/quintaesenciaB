'use client'
import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * true una vez hidratado el cliente. El carrito (zustand + localStorage) se lee de forma síncrona al
 * cargar el módulo en el navegador, así que basta con distinguir servidor / hidratación / cliente.
 * Evita desajustes de hidratación sin depender del indicador `hydrated` del store.
 */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
