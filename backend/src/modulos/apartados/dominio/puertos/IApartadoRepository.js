/**
 * Puerto de salida — contrato de persistencia para el agregado Apartado.
 * HU-0700.1 · Patrón hexagonal / Data Mapper.
 */
export class IApartadoRepository {
  /**
   * Guarda un nuevo apartado completo de forma transaccional
   * insertando el encabezado, sus productos y el abono inicial.
   * @param {import('../Apartado.js').Apartado} apartado
   * @returns {Promise<number>} ID del apartado insertado.
   */
  async guardar(apartado) {
    throw new Error('IApartadoRepository.guardar() no implementado.');
  }

  /**
   * Busca un apartado por su ID interno incluyendo productos y abonos.
   * @param {number} id
   * @returns {Promise<import('../Apartado.js').Apartado | null>}
   */
  async buscarPorId(id) {
    throw new Error('IApartadoRepository.buscarPorId() no implementado.');
  }

  /**
   * Busca un apartado por su código visible (ej: AP-0001).
   * @param {string} codigo
   * @returns {Promise<import('../Apartado.js').Apartado | null>}
   */
  async buscarPorCodigo(codigo) {
    throw new Error('IApartadoRepository.buscarPorCodigo() no implementado.');
  }

  /**
   * Lista todos los apartados con estado ACTIVO.
   * @returns {Promise<Array<import('../Apartado.js').Apartado>>}
   */
  async listarActivos() {
    throw new Error('IApartadoRepository.listarActivos() no implementado.');
  }

  /**
   * Lista todos los apartados sin importar su estado.
   * @returns {Promise<Array<import('../Apartado.js').Apartado>>}
   */
  async listarTodos() {
    throw new Error('IApartadoRepository.listarTodos() no implementado.');
  }

  /**
   * Actualiza los datos generales de un apartado (ej. estado, saldo).
   * @param {import('../Apartado.js').Apartado} apartado
   * @returns {Promise<void>}
   */
  async actualizar(apartado) {
    throw new Error('IApartadoRepository.actualizar() no implementado.');
  }

  /**
   * Registra un abono adicional a un apartado existente.
   * @param {number} apartadoId
   * @param {{ usuarioId: number, monto: number, medioPago?: string, saldoRestante: number }} datosAbono
   * @returns {Promise<number>} ID del abono registrado.
   */
  async registrarAbono(apartadoId, datosAbono) {
    throw new Error('IApartadoRepository.registrarAbono() no implementado.');
  }

  /**
   * Actualiza únicamente el estado de un apartado.
   * @param {number} id
   * @param {string} nuevoEstado
   * @returns {Promise<void>}
   */
  async actualizarEstado(id, nuevoEstado) {
    throw new Error('IApartadoRepository.actualizarEstado() no implementado.');
  }
}
