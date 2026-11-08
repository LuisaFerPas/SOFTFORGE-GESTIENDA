/**
 * HU-0702 — Validación pura del monto de un abono.
 * Sin React: se prueba con `node --test`.
 */

export const MENSAJE_MONTO_INVALIDO =
  'El monto debe ser un número mayor que 0.';

export const MENSAJE_MONTO_EXCEDE_SALDO =
  'El monto no puede superar el saldo pendiente.';

export const MENSAJE_SALDO_INVALIDO =
  'El saldo pendiente no es válido.';

/**
 * Valida el monto de un abono contra el saldo pendiente del apartado.
 * @param {string|number} monto
 * @param {string|number} saldo
 * @returns {{ valido: boolean, error?: string }}
 */
export function validarAbono(monto, saldo) {
  const montoNumero = normalizarMonto(monto);
  if (montoNumero === null || montoNumero <= 0) {
    return { valido: false, error: MENSAJE_MONTO_INVALIDO };
  }

  const saldoNumero = Number(saldo);
  if (!Number.isFinite(saldoNumero) || saldoNumero < 0) {
    return { valido: false, error: MENSAJE_SALDO_INVALIDO };
  }

  if (montoNumero > saldoNumero) {
    return { valido: false, error: MENSAJE_MONTO_EXCEDE_SALDO };
  }

  return { valido: true };
}

function normalizarMonto(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }

  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (texto === '') return null;
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  }

  return null;
}
