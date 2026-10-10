/**
 * Value Object / Enum inmutable con las 5 categorías oficiales de Variedades Don Mati.
 */
export const CategoriaProducto = Object.freeze({
  JUGUETES: 'Juguetes',
  ASEO: 'Aseo',
  CACHARRO: 'Cacharro',
  MAQUILLAJE: 'Maquillaje',
  PINATERIA: 'Piñatería'
});

export const CATEGORIAS_VALIDAS = Object.freeze(Object.values(CategoriaProducto));

/**
 * Valida si un texto corresponde a una de las categorías válidas de Don Mati (insensible a mayúsculas/acentos básicos).
 * @param {string} categoria 
 * @returns {boolean}
 */
export function esCategoriaValida(categoria) {
  if (!categoria || typeof categoria !== 'string') return false;
  const normalizada = categoria.trim().toLowerCase();
  return CATEGORIAS_VALIDAS.some(c => 
    c.toLowerCase() === normalizada || 
    c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === normalizada.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
}

/**
 * Normaliza el nombre de la categoría al formato estándar 
 * @param {string} categoria 
 * @returns {string|null}
 */
export function normalizarCategoria(categoria) {
  if (!categoria || typeof categoria !== 'string') return null;
  const normalizada = categoria.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const match = CATEGORIAS_VALIDAS.find(c => 
    c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === normalizada
  );
  return match || null;
}
