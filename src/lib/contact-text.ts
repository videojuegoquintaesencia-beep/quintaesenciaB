/**
 * Frases de "escríbenos" que dependen del email de contacto configurado en el panel. El email puede quedar vacío
 * (la dueña decide qué datos publica), y entonces se remite a la página de contacto en vez de dejar un hueco.
 * Código puro: vale en el navegador y en el servidor.
 */

/** "escríbenos a hola@…" o, sin email, "escríbenos desde la página de contacto". Va en minúscula para ir dentro de una frase. */
export function writeToUs(email: string): string {
  return email ? `escríbenos a ${email}` : 'escríbenos desde la página de contacto'
}

/** Igual que `writeToUs`, pero para empezar la frase. */
export function writeToUsCapitalized(email: string): string {
  const text = writeToUs(email)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
