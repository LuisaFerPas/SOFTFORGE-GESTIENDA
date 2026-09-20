/**
 * Servicio de Gestión de Apartados (HE-07)
 */
export class ApartadoService {
  constructor(apartadoRepository, eventBus) {
    this.apartadoRepository = apartadoRepository;
    this.eventBus = eventBus;
  }

  async crearApartado(datosApartado) {
    // TODO: Registrar apartado, descontar stock de inventario (HU-0701)
  }

  async registrarAbono(apartadoId, monto, medioPago, usuarioId) {
    // TODO: Registrar abono parcial y verificar si completa el pago total (HU-0702)
  }

  async cancelarApartado(apartadoId, usuarioId) {
    // TODO: Cancelar apartado, liberar inventario y retener abono (HU-0703)
  }

  async listarApartadosActivos() {
    // TODO: Consultar listado de apartados activos
  }
}
