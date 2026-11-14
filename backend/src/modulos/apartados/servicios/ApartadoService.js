import { Result } from '../../../shared/Result.js';
import { AbonoApartadoUseCase } from './AbonoApartadoUseCase.js';
import { StockService } from '../../inventario/aplicacion/StockService.js';

export class ApartadoService {
  constructor(apartadoRepository, eventBus, productoRepository) {
    this.apartadoRepository = apartadoRepository;
    this.eventBus = eventBus;
    this.productoRepository = productoRepository;
    this.stockService = new StockService(productoRepository);
  }

  async crearApartado(datosApartado) {
    try {
      const { clienteNombre, productos, abonoInicial } = datosApartado;

      if (!clienteNombre || clienteNombre.trim() === '') {
        return Result.fail('El nombre del cliente es obligatorio.');
      }
      if (!Array.isArray(productos) || productos.length === 0) {
        return Result.fail('Debe incluir al menos un producto en el apartado.');
      }
      
      const abono = Number(abonoInicial);
      if (isNaN(abono) || abono <= 0) {
        return Result.fail('El abono inicial debe ser un número mayor a cero.');
      }

      const productosValidados = [];
      for (const item of productos) {
        const prod = await this.productoRepository.buscarPorId(item.productoId);
        
        if (!prod) {
          return Result.fail(`El producto con ID ${item.productoId} no existe.`);
        }
        
        if (prod.stockActual < item.cantidad) {
          return Result.fail(`Producto no disponible: "${prod.nombre}". Stock actual: ${prod.stockActual}, solicitado: ${item.cantidad}.`);
        }
        
        productosValidados.push({
          productoId: prod.id,
          nombre: prod.nombre,
          cantidad: item.cantidad,
          precioUnitario: prod.precioVentaUnitario,
          subtotal: prod.precioVentaUnitario * item.cantidad
        });
      }

      const total = productosValidados.reduce((sum, p) => sum + p.subtotal, 0);
      if (abono > total) {
        return Result.fail('El abono inicial no puede ser mayor al total del apartado.');
      }

      const nuevoApartado = {
        id: Math.floor(Math.random() * 1000) + 1,
        clienteNombre,
        abonoInicial: abono,
        total,
        saldoPendiente: total - abono,
        estado: 'ACTIVO',
        fechaCreacion: new Date().toISOString(),
        productos: productosValidados
      };

      return Result.ok({
        message: 'Apartado creado exitosamente',
        data: nuevoApartado
      });

    } catch (error) {
      console.error('Error en ApartadoService.crearApartado:', error);
      return Result.fail('Error interno al crear el apartado.');
    }
  }

  async registrarAbono(apartadoId, monto, medioPago, usuarioId) {
    const casoUso = new AbonoApartadoUseCase(this.apartadoRepository, this.eventBus);
    return casoUso.registrar(apartadoId, { monto, medioPago }, usuarioId);
  }

  /**
   * HU-0703.2: Cancela un apartado activo y devuelve los productos al inventario.
   * @param {number|string} apartadoId
   * @returns {Promise<Result>}
   */
  async cancelarApartado(apartadoId) {
    try {
      const id = Number(apartadoId);
      if (!Number.isInteger(id) || id <= 0) {
        return Result.fail({ status: 400, message: 'El ID del apartado debe ser un número entero positivo.' });
      }

      // Delega la transacción atómica al repositorio SQLite
      const resultado = this.apartadoRepository.cancelarConDevolucionStock(id);
      return Result.ok({
        message: 'Apartado cancelado exitosamente. Los productos han sido devueltos al inventario.',
        data: resultado
      });
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Error interno al cancelar el apartado.';
      console.error('Error en ApartadoService.cancelarApartado:', error);
      return Result.fail({ status, message });
    }
  }

  async listarApartadosActivos() {
    const casoUso = new AbonoApartadoUseCase(this.apartadoRepository, this.eventBus);
    return casoUso.listarActivos();
  }
}