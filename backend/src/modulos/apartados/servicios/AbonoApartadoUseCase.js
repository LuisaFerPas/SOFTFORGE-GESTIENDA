import { Result } from '../../../shared/Result.js';
import { EstadoApartado } from '../dominio/Apartado.js';

const MEDIOS_PAGO = new Set(['EFECTIVO', 'NEQUI', 'OTRO']);

/**
 * Caso de uso para registrar abonos de apartados (HU-0702).
 * Encapsula validaciones, actualización del agregado y persistencia atómica.
 */
export class AbonoApartadoUseCase {
  constructor(apartadoRepository, eventBus) {
    this.apartadoRepository = apartadoRepository;
    this.eventBus = eventBus;
  }

  /**
   * Registra un abono adicional sobre un apartado ACTIVO.
   * @param {number|string} apartadoId
   * @param {{ monto: number|string, medioPago?: string }} datosAbono
   * @param {number} usuarioId
   * @returns {Promise<import('../../../shared/Result.js').Result>}
   */
  async registrar(apartadoId, { monto, medioPago } = {}, usuarioId) {
    const id = Number(apartadoId);
    if (!Number.isInteger(id) || id <= 0) {
      return Result.fail({
        status: 400,
        message: 'El identificador del apartado no es válido.'
      });
    }

    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      return Result.fail({
        status: 400,
        message: 'El monto del abono debe ser un número mayor que cero.'
      });
    }

    const medio = medioPago ?? 'EFECTIVO';
    if (!MEDIOS_PAGO.has(medio)) {
      return Result.fail({
        status: 400,
        message: `Medio de pago inválido '${medio}'. Use EFECTIVO, NEQUI u OTRO.`
      });
    }

    const apartado = await this.apartadoRepository.buscarPorId(id);
    if (!apartado) {
      return Result.fail({ status: 404, message: 'Apartado no encontrado.' });
    }

    if (apartado.estado !== EstadoApartado.ACTIVO) {
      return Result.fail({
        status: 409,
        message: `No se pueden registrar abonos en un apartado ${apartado.estado}.`
      });
    }

    if (montoNumero > apartado.saldoPendiente) {
      return Result.fail({
        status: 400,
        message: 'El monto del abono no puede superar el saldo pendiente.'
      });
    }

    const usuarioAbono = usuarioId ?? apartado.usuarioId;

    try {
      apartado.agregarAbono({
        monto: montoNumero,
        usuarioId: usuarioAbono,
        medioPago: medio
      });
    } catch (error) {
      return Result.fail({ status: 400, message: error.message });
    }

    await this.apartadoRepository.registrarAbono(apartado.id, {
      usuarioId: usuarioAbono,
      monto: montoNumero,
      medioPago: medio,
      saldoRestante: apartado.saldoPendiente
    });

    const completado = apartado.estado === EstadoApartado.COMPLETADO;
    const apartadoPlano = apartado.aObjetoPlano();

    if (completado) {
      this.eventBus?.publish('apartado.completado', apartadoPlano);
    }

    return Result.ok({ apartado: apartadoPlano, completado });
  }

  /**
   * Lista los apartados ACTIVOS con sus productos y abonos.
   * @returns {Promise<import('../../../shared/Result.js').Result>}
   */
  async listarActivos() {
    const apartados = await this.apartadoRepository.listarActivos();
    return Result.ok(apartados.map((apartado) => apartado.aObjetoPlano()));
  }
}
