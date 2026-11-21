import { Badge } from '@/components/ui/Badge'

/** "Personalizada" (hay valores guardados en el panel) o "Por defecto" (se usan los del código). */
export function SectionStatusBadge({ overridden, className }: { overridden: boolean; className?: string }) {
  return (
    <Badge tone={overridden ? 'success' : 'neutral'} className={className}>
      {overridden ? 'Personalizada' : 'Por defecto'}
    </Badge>
  )
}
