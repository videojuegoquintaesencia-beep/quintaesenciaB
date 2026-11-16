import type { ApiFailure } from './api'

/** Lo que el formulario ofrece a los distintos métodos de pago. */
export interface PaymentBridge {
  /** Valida el formulario; si hay errores los muestra y devuelve false. */
  validate: () => boolean
  /** Crea el pedido pendiente en el servidor (lanza CheckoutError, ya mostrado, si falla). */
  createServerOrder: () => Promise<{ orderId: string; paypalOrderId?: string }>
  /** Pago confirmado: vacía el carrito y lleva al cliente a su pedido. */
  onPaid: (redirect: string) => void
  /** Muestra un error de pago (sin tocar el carrito). */
  onFailure: (failure: ApiFailure) => void
  /** Mensaje informativo (cancelación, pago pendiente…). */
  onNotice: (message: string) => void
  setProcessing: (processing: boolean) => void
  processing: boolean
}
