import { AbonoApartadoUseCase } from './AbonoApartadoUseCase.js';

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
    const casoUso = new AbonoApartadoUseCase(this.apartadoRepository, this.eventBus);
    return casoUso.registrar(apartadoId, { monto, medioPago }, usuarioId);
  }

  async cancelarApartado(apartadoId, usuarioId) {
    // TODO: Cancelar apartado, liberar inventario y retener abono (HU-0703)
  }

  async listarApartadosActivos() {
    const casoUso = new AbonoApartadoUseCase(this.apartadoRepository, this.eventBus);
    return casoUso.listarActivos();
  }
}
