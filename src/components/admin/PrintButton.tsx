'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ className, label = 'Imprimir' }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <Printer size={18} aria-hidden="true" />
      {label}
    </button>
  )
}
