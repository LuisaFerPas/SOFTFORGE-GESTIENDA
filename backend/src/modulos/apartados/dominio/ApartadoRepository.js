/**
 * Contrato de persistencia para Apartados
 */
export class ApartadoRepository {
  async guardar(apartado, items, abonoInicial) { throw new Error('Método no implementado'); }
  async buscarPorId(id) { throw new Error('Método no implementado'); }
  async buscarPorCodigo(codigo) { throw new Error('Método no implementado'); }
  async listarActivos() { throw new Error('Método no implementado'); }
  async registrarAbono(abono) { throw new Error('Método no implementado'); }
  async actualizarEstado(id, nuevoEstado) { throw new Error('Método no implementado'); }
}
