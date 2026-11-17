/**
 * Primera palabra de un nombre de entidad ("Club Deportivo Los Pinos", "AMPA…"): no es un nombre de pila,
 * así que los saludos no la usan sola ("Hola Club").
 */
export const ENTITY_WORD =
  /^(club|asociaci[oó]n|asoc|ampa|ayuntamiento|colegio|instituto|universidad|empresa|grupo|pe[ñn]a|hermandad|cofrad[ií]a|fundaci[oó]n|cooperativa|equipo|escuela|academia|bar|restaurante|cervecer[ií]a|cafeter[ií]a|tienda|taller|estudio|hotel|gimnasio|comunidad|sociedad)$/iu
