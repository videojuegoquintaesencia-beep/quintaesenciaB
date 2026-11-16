import { Badge } from '@/components/ui/Badge'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_TONE,
  type OrderStatus,
  type QuoteStatus,
} from '@/lib/order-status'

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status]} className={className}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  )
}

export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  return (
    <Badge tone={QUOTE_STATUS_TONE[status]} className={className}>
      {QUOTE_STATUS_LABEL[status]}
    </Badge>
  )
}
