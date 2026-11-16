'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Mientras el pago está pendiente, vuelve a pedir la página cada pocos segundos (unos minutos como máximo). */
export function OrderAutoRefresh({ intervalMs = 6000, maxTries = 30 }: { intervalMs?: number; maxTries?: number }) {
  const router = useRouter()
  useEffect(() => {
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (tries > maxTries) clearInterval(timer)
      else router.refresh()
    }, intervalMs)
    return () => clearInterval(timer)
  }, [router, intervalMs, maxTries])
  return null
}
