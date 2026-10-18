import { Result } from '../../../shared/Result.js';
import { Producto } from '../dominio/Producto.js';
import { esCategoriaValida, CATEGORIAS_VALIDAS } from '../dominio/CategoriaProducto.js';

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

  /**
   * Registra un nuevo producto en el catálogo.
   * Valida códigos únicos, categorías oficiales y valores monetarios.
   * @param {Object} datos
   * @returns {Promise<Result>}
   */
  async registrarProducto(datos = {}) {
    try {
      const {
        codigoInterno,
        codigoBarras,
        nombre,
        categoria,
        subcategoria,
        marca,
        costoCompra = 0,
        precioVentaUnitario = 0,
        precioVentaMayor = 0,
        ivaPorcentaje = 0,
        stockActual = 0,
        stockMinimoAlerta = 10
      } = datos;

      if (!codigoInterno || !String(codigoInterno).trim()) {
        return Result.fail('El código interno es obligatorio.');
      }

      if (!nombre || !String(nombre).trim()) {
        return Result.fail('El nombre del producto es obligatorio.');
      }

      if (!categoria || !esCategoriaValida(categoria)) {
        return Result.fail(`La categoría "${categoria}" no es válida. Debe ser una de: ${CATEGORIAS_VALIDAS.join(', ')}.`);
      }

      // Validar que el código interno no esté duplicado
      const existeCodigoInterno = await this.productoRepository.buscarPorCodigoInterno(codigoInterno);
      if (existeCodigoInterno) {
        return Result.fail(`Ya existe un producto con el código interno "${codigoInterno}".`);
      }

      // Validar código de barras si se especificó
      if (codigoBarras && String(codigoBarras).trim()) {
        const existeCodigoBarras = await this.productoRepository.buscarPorCodigoBarras(codigoBarras);
        if (existeCodigoBarras) {
          return Result.fail(`Ya existe un producto con el código de barras "${codigoBarras}".`);
        }
      }

      const nuevoProducto = new Producto({
        codigoInterno,
        codigoBarras: codigoBarras ? String(codigoBarras).trim() : null,
        nombre,
        categoria,
        subcategoria,
        marca,
        costoCompra,
        precioVentaUnitario,
        precioVentaMayor,
        ivaPorcentaje,
        stockActual,
        stockMinimoAlerta,
        activo: 1
      });

      const nuevoId = await this.productoRepository.guardar(nuevoProducto);
      nuevoProducto.id = nuevoId;

      return Result.ok(nuevoProducto.aObjetoPlano());
    } catch (error) {
      return Result.fail(`Error al registrar producto: ${error.message}`);
    }
  }

  /**
   *  Modifica la información de un producto existente.
   * Preserva el código interno original por trazabilidad.
   * @param {number|string} id
   * @param {Object} datos
   * @returns {Promise<Result>}
   */
  async modificarProducto(id, datos = {}) {
    try {
      if (!id) {
        return Result.fail('El ID del producto es obligatorio.');
      }

      const productoExistente = await this.productoRepository.buscarPorId(id);
      if (!productoExistente) {
        return Result.fail('Producto no encontrado.');
      }

      // Preservar código interno para trazabilidad (inmutable)
      if (
        datos.codigoInterno &&
        String(datos.codigoInterno).trim().toLowerCase() !== productoExistente.codigoInterno.toLowerCase()
      ) {
        return Result.fail('El código interno del producto no puede ser modificado para preservar la trazabilidad.');
      }

      // Validar categoría si fue modificada
      const categoriaFinal = datos.categoria !== undefined ? datos.categoria : productoExistente.categoria;
      if (!esCategoriaValida(categoriaFinal)) {
        return Result.fail(`La categoría "${categoriaFinal}" no es válida. Debe ser una de: ${CATEGORIAS_VALIDAS.join(', ')}.`);
      }

      const productoActualizado = new Producto({
        id: productoExistente.id,
        codigoInterno: productoExistente.codigoInterno,
        codigoBarras:
          datos.codigoBarras !== undefined
            ? (datos.codigoBarras ? String(datos.codigoBarras).trim() : null)
            : productoExistente.codigoBarras,
        nombre: datos.nombre !== undefined ? datos.nombre : productoExistente.nombre,
        categoria: categoriaFinal,
        subcategoria: datos.subcategoria !== undefined ? datos.subcategoria : productoExistente.subcategoria,
        marca: datos.marca !== undefined ? datos.marca : productoExistente.marca,
        costoCompra: datos.costoCompra !== undefined ? datos.costoCompra : productoExistente.costoCompra,
        precioVentaUnitario:
          datos.precioVentaUnitario !== undefined
            ? datos.precioVentaUnitario
            : productoExistente.precioVentaUnitario,
        precioVentaMayor:
          datos.precioVentaMayor !== undefined ? datos.precioVentaMayor : productoExistente.precioVentaMayor,
        ivaPorcentaje:
          datos.ivaPorcentaje !== undefined ? datos.ivaPorcentaje : productoExistente.ivaPorcentaje,
        stockActual: productoExistente.stockActual,
        stockMinimoAlerta:
          datos.stockMinimoAlerta !== undefined
            ? datos.stockMinimoAlerta
            : productoExistente.stockMinimoAlerta,
        fechaUltimaCompra: productoExistente.fechaUltimaCompra,
        fechaUltimaVenta: productoExistente.fechaUltimaVenta,
        activo: datos.activo !== undefined ? (datos.activo ? 1 : 0) : productoExistente.activo
      });

      await this.productoRepository.actualizar(productoActualizado);
      return Result.ok(productoActualizado.aObjetoPlano());
    } catch (error) {
      return Result.fail(`Error al modificar producto: ${error.message}`);
    }
  }

  /**
   * Da de baja un producto del catálogo aplicando la estrategia correcta según HU-0503:
   * - Sin historial de movimientos → eliminación FÍSICA (DELETE): libera los códigos únicos.
   * - Con historial de movimientos → baja LÓGICA (activo=0): conserva integridad referencial.
   * @param {number|string} id
   * @returns {Promise<Result>}
   */
  async darDeBajaProducto(id) {
    try {
      if (!id) {
        return Result.fail('El ID del producto es obligatorio.');
      }

      const productoExistente = await this.productoRepository.buscarPorId(id);
      if (!productoExistente) {
        return Result.fail('Producto no encontrado.');
      }

      if (!productoExistente.activo) {
        return Result.fail('El producto ya se encuentra inactivo.');
      }

      const tieneHistorial = await this.productoRepository.tieneMovimientos(id);

      if (tieneHistorial) {
        // HU-0503 Criterio 3: tiene ventas/movimientos → baja lógica para conservar historial
        await this.productoRepository.desactivar(id);
        return Result.ok({
          id: Number(id),
          nombre: productoExistente.nombre,
          codigoInterno: productoExistente.codigoInterno,
          tipo: 'BAJA_LOGICA',
          mensaje: 'Producto marcado como inactivo. Su historial de movimientos se conserva.'
        });
      } else {
        // HU-0503 Criterio 2: sin historial → eliminación física, libera código para reutilización
        await this.productoRepository.eliminar(id);
        return Result.ok({
          id: Number(id),
          nombre: productoExistente.nombre,
          codigoInterno: productoExistente.codigoInterno,
          tipo: 'ELIMINACION_FISICA',
          mensaje: 'Producto eliminado permanentemente del catálogo.'
        });
      }
    } catch (error) {
      return Result.fail(`Error al dar de baja el producto: ${error.message}`);
    }
  }
}

