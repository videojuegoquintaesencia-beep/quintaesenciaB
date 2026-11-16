'use client'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function LegalPrintButton() {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden="true" className="size-4" />
      Imprimir o guardar en PDF
    </Button>
  )
}
