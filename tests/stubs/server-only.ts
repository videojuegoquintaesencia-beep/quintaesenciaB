/**
 * Sustituto de `server-only` para las pruebas (ver `vitest.config.ts`). El paquete real lanza un error al
 * importarse fuera de un React Server Component; aquí no hace falta: las pruebas ya corren en Node.
 */
export {}
