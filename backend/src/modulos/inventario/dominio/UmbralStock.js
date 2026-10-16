import { Result } from '../../../shared/Result.js';

export const UMBRAL_POR_DEFECTO = 10;

export function normalizarUmbral(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return Result.ok(UMBRAL_POR_DEFECTO);
  }
  const n = Number(valor);
  if (!Number.isFinite(n)) return Result.fail('El umbral mínimo debe ser un número');
  if (!Number.isInteger(n)) return Result.fail('El umbral mínimo debe ser un número entero (sin decimales)');
  if (n < 0) return Result.fail('El umbral mínimo no puede ser negativo');
  return Result.ok(n);
}