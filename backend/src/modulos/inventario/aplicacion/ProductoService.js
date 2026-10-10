import { Result } from '../../../shared/Result.js';

/**
 * Servicio de Aplicación para el Módulo de Inventario y Productos.
 * Orquesta las consultas del catálogo y aplica reglas de seguridad RBAC (HU-0607).
 */
export class ProductoService {
  constructor(productoRepository) {
    this.productoRepository = productoRepository;
  }

  /**
   * Lista todos los productos aplicando filtros y sanitización según el rol del usuario (HU-0607).
   * @param {Object} params
   * @param {Object} params.filtros - { search, categoria, estadoStock }
   * @param {string} params.rolUsuario - 'ADMINISTRADOR' o 'VENDEDOR'
   * @returns {Promise<Result>}
   */
  async listarProductos({ filtros = {}, rolUsuario = 'ADMINISTRADOR' } = {}) {
    try {
      const productos = await this.productoRepository.listarTodos(filtros);

      if (rolUsuario === 'VENDEDOR') {
        // HU-0607: El vendedor NO debe ver cantidades de stock ni costos
        const sanitizados = productos.map((p) => p.sanitizarParaVendedor());
        return Result.ok(sanitizados);
      }

      // Administrador: ve todos los datos y métricas de stock
      const completos = productos.map((p) => p.aObjetoPlano());
      return Result.ok(completos);
    } catch (error) {
      return Result.fail(`Error al listar productos: ${error.message}`);
    }
  }

  /**
   * Obtiene un producto por su ID sanitizado según el rol (HU-0607).
   */
  async obtenerPorId(id, rolUsuario = 'ADMINISTRADOR') {
    try {
      const producto = await this.productoRepository.buscarPorId(id);
      if (!producto || !producto.activo) {
        return Result.fail('Producto no encontrado.');
      }

      if (rolUsuario === 'VENDEDOR') {
        return Result.ok(producto.sanitizarParaVendedor());
      }

      return Result.ok(producto.aObjetoPlano());
    } catch (error) {
      return Result.fail(`Error al obtener producto: ${error.message}`);
    }
  }

  /**
   * Obtiene un producto por su código interno o de barras (HU-0504).
   */
  async obtenerPorCodigo(codigo, rolUsuario = 'ADMINISTRADOR') {
    try {
      if (!codigo || !String(codigo).trim()) {
        return Result.fail('Debe ingresar un código para buscar.');
      }

      const producto = await this.productoRepository.buscarPorCodigo(codigo);
      if (!producto || !producto.activo) {
        return Result.fail(`No se encontró ningún producto con el código "${codigo}".`);
      }

      if (rolUsuario === 'VENDEDOR') {
        return Result.ok(producto.sanitizarParaVendedor());
      }

      return Result.ok(producto.aObjetoPlano());
    } catch (error) {
      return Result.fail(`Error al buscar producto por código: ${error.message}`);
    }
  }

  /**
   * HU-0607: Consulta de stock actual restringida por perfil.
   * Deniega el acceso a usuarios con rol VENDEDOR.
   */
  async consultarStockActual(id, rolUsuario) {
    try {
      if (rolUsuario === 'VENDEDOR') {
        return Result.fail('Acceso restringido: Los usuarios con perfil Vendedor no tienen permiso para consultar cantidades de stock.');
      }

      const producto = await this.productoRepository.buscarPorId(id);
      if (!producto || !producto.activo) {
        return Result.fail('Producto no encontrado.');
      }

      return Result.ok({
        id: producto.id,
        nombre: producto.nombre,
        codigoInterno: producto.codigoInterno,
        stockActual: producto.stockActual,
        stockMinimoAlerta: producto.stockMinimoAlerta,
        tieneStockBajo: producto.tieneStockBajo(),
        estaAgotado: producto.estaAgotado()
      });
    } catch (error) {
      return Result.fail(`Error al consultar stock: ${error.message}`);
    }
  }

  /**
   * HU-0604: Obtiene los productos con stock bajo o agotados (Solo Administrador).
   */
  async obtenerAlertasStock(rolUsuario = 'ADMINISTRADOR') {
    try {
      if (rolUsuario === 'VENDEDOR') {
        return Result.fail('Acceso restringido: Solo el Administrador puede consultar alertas de stock.');
      }

      const todos = await this.productoRepository.listarTodos();
      const alertas = todos
        .filter((p) => p.tieneStockBajo() || p.estaAgotado())
        .map((p) => p.aObjetoPlano())
        .sort((a, b) => a.stockActual - b.stockActual);

      return Result.ok(alertas);
    } catch (error) {
      return Result.fail(`Error al obtener alertas de stock: ${error.message}`);
    }
  }
}
