/** Lecturas con caché por petición: la página y `generateMetadata` comparten una sola consulta. */
import 'server-only'
import { cache } from 'react'
import { getOrderById } from '@/lib/orders'
import { getQuote } from '@/lib/quotes'

export const loadOrder = cache(getOrderById)
export const loadQuote = cache(getQuote)
