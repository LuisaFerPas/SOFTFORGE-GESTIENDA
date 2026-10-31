import { Result } from '../../../shared/Result.js';

const CONSECUTIVO = /^F-[0-9]{4,}$/;

export class ReutilizacionVentaService {
  constructor(repository) {
    this.repository = repository;
  }

  async anularYCargarCarrito(consecutivo, usuario = {}) {
    try {
      if (usuario?.role !== 'ADMINISTRADOR') {
        return Result.fail('Permisos insuficientes');
      }
      const usuarioId = Number(usuario?.id);
      if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        return Result.fail('Usuario inválido.');
      }
      if (typeof consecutivo !== 'string') {
        return Result.fail('El consecutivo debe tener el formato F-0001.');
      }
      const numero = consecutivo.trim().toUpperCase();
      if (!CONSECUTIVO.test(numero)) {
        return Result.fail('El consecutivo debe tener el formato F-0001.');
      }

      const resultado = await this.repository.anularVentaYFacturaYObtenerItems(
        numero, usuarioId
      );
      return Result.ok(resultado);
    } catch (error) {
      return Result.fail(error.message || 'No fue posible reutilizar la venta.');
    }
  }
}
