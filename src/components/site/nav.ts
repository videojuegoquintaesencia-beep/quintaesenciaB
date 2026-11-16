/** Enlaces de navegación principal (cabecera). */
export const NAV_LINKS = [
  { href: '/productos', label: 'Productos' },
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/empresas', label: 'Empresas' },
  { href: '/contacto', label: 'Contacto' },
] as const

/** Enlaces extra que solo aparecen en el menú móvil. */
export const NAV_EXTRA_LINKS = [
  { href: '/preguntas-frecuentes', label: 'Preguntas frecuentes' },
  { href: '/seguimiento', label: 'Seguimiento de pedido' },
] as const

/** ¿Está activo este enlace en la ruta actual? (`/productos` también cuenta para `/productos/camisetas…`) */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}
