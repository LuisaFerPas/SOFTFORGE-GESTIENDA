export const UMBRAL_POR_DEFECTO = 10;

export function validarUmbral(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return { valido: true, error: null, valorNormalizado: UMBRAL_POR_DEFECTO };
  }
  const n = Number(valor);
  if (!Number.isFinite(n)) {
    return { valido: false, error: 'El umbral mínimo debe ser un número', valorNormalizado: null };
  }
  if (!Number.isInteger(n)) {
    return { valido: false, error: 'El umbral mínimo debe ser un número entero (sin decimales)', valorNormalizado: null };
  }
  if (n < 0) {
    return { valido: false, error: 'El umbral mínimo no puede ser negativo', valorNormalizado: null };
  }
  return { valido: true, error: null, valorNormalizado: n };
}