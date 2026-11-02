import { Result } from '../../../shared/Result.js';

const CONSECUTIVO = /^F-[0-9]{4,}$/;

export class EdicionFacturaService {
  constructor(repository) {
    this.repository = repository;
  }

  async editarFactura(consecutivo, datos = {}, usuario = {}) {
    try {
      if (usuario?.role !== 'ADMINISTRADOR') {
        return Result.fail('Permisos insuficientes');
      }
      if (typeof consecutivo !== 'string') {
        return Result.fail('El consecutivo debe tener el formato F-0001.');
      }
      const numero = consecutivo.trim().toUpperCase();
      if (!CONSECUTIVO.test(numero)) {
        return Result.fail('El consecutivo debe tener el formato F-0001.');
      }

      const { nombreCliente } = datos ?? {};
      if (nombreCliente != null && typeof nombreCliente !== 'string') {
        return Result.fail('El nombre del cliente debe ser un texto de máximo 150 caracteres.');
      }
      const nombre = (nombreCliente ?? '').trim() || 'Consumidor Final';
      if (nombre.length > 150) {
        return Result.fail('El nombre del cliente debe ser un texto de máximo 150 caracteres.');
      }

      const resultado = await this.repository.reemplazarFactura(numero, {
        nombreCliente: nombre
      });
      return Result.ok(resultado);
    } catch (error) {
      return Result.fail(error.message || 'No fue posible editar la factura.');
    }
  }
}
