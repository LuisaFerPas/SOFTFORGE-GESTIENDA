import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Package, 
  Tag, 
  Barcode, 
  DollarSign, 
  Percent, 
  Layers, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  HelpCircle,
  Lock
} from 'lucide-react';
import { formatCOP } from '../utilidades/formatoMoneda.js';
import { validarUmbral, UMBRAL_POR_DEFECTO } from '../utilidades/validarUmbral.js';
import { registrarProductoApi, modificarProductoApi } from '../servicios/inventarioService.js';

export const CATEGORIAS_OFICIALES = [
  'Juguetes',
  'Aseo',
  'Cacharro',
  'Maquillaje',
  'Piñatería'
];

/**
 * Modal para Registrar (HU-0501) y Modificar (HU-0502) Productos en el Catálogo.
 * Incluye cálculo dinámico de márgenes de utilidad en tiempo real y compatibilidad con escáner USB.
 */
export function ProductoModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  productoAEditar = null 
}) {
  const esEdicion = Boolean(productoAEditar && productoAEditar.id);

  // Estados del formulario
  const [codigoInterno, setCodigoInterno] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Juguetes');
  const [subcategoria, setSubcategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [costoCompra, setCostoCompra] = useState('');
  const [precioVentaUnitario, setPrecioVentaUnitario] = useState('');
  const [precioVentaMayor, setPrecioVentaMayor] = useState('');
  const [ivaPorcentaje, setIvaPorcentaje] = useState(0);
  const [stockActual, setStockActual] = useState(0);
  const [stockMinimoAlerta, setStockMinimoAlerta] = useState(UMBRAL_POR_DEFECTO);

  // Estados de control
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const inputCodigoRef = useRef(null);

  // Cargar datos al abrir el modal (Creación vs Edición)
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setExito(false);

    if (esEdicion && productoAEditar) {
      setCodigoInterno(productoAEditar.codigoInterno || '');
      setCodigoBarras(productoAEditar.codigoBarras || '');
      setNombre(productoAEditar.nombre || '');
      setCategoria(productoAEditar.categoria || 'Juguetes');
      setSubcategoria(productoAEditar.subcategoria || '');
      setMarca(productoAEditar.marca || '');
      setCostoCompra(productoAEditar.costoCompra ?? '');
      setPrecioVentaUnitario(productoAEditar.precioVentaUnitario ?? '');
      setPrecioVentaMayor(productoAEditar.precioVentaMayor ?? '');
      setIvaPorcentaje(productoAEditar.ivaPorcentaje ?? 0);
      setStockActual(productoAEditar.stockActual ?? 0);
      setStockMinimoAlerta(productoAEditar.stockMinimoAlerta ?? UMBRAL_POR_DEFECTO);
    } else {
      // Modo creación por defecto
      setCodigoInterno('');
      setCodigoBarras('');
      setNombre('');
      setCategoria('Juguetes');
      setSubcategoria('');
      setMarca('');
      setCostoCompra('');
      setPrecioVentaUnitario('');
      setPrecioVentaMayor('');
      setIvaPorcentaje(0);
      setStockActual(0);
      setStockMinimoAlerta(UMBRAL_POR_DEFECTO);

      // Autofoco en el código interno para recepción rápida con pistola escáner USB (HU-0501 Escenario 6)
      setTimeout(() => {
        if (inputCodigoRef.current) {
          inputCodigoRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, esEdicion, productoAEditar]);

  if (!isOpen) return null;

  // Cálculos dinámicos en tiempo real (HU-0501.2)
  const numCosto = Number(costoCompra) || 0;
  const numPrecioVenta = Number(precioVentaUnitario) || 0;

  const gananciaUnitaria = Math.max(0, numPrecioVenta - numCosto);
  let margenPorcentaje = 0;
  if (numCosto > 0) {
    margenPorcentaje = Number((((numPrecioVenta - numCosto) / numCosto) * 100).toFixed(1));
  } else if (numPrecioVenta > 0) {
    margenPorcentaje = 100;
  }

  const esPrecioBajo = numPrecioVenta > 0 && numCosto > 0 && numPrecioVenta < numCosto;

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones del cliente
    if (!codigoInterno.trim()) {
      setError('El código interno del producto es obligatorio.');
      return;
    }
    if (!nombre.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }
    if (!categoria) {
      setError('Debe seleccionar una categoría oficial.');
      return;
    }
    if (numCosto < 0) {
      setError('El costo de compra no puede ser negativo.');
      return;
    }
    if (numPrecioVenta < 0) {
      setError('El precio de venta no puede ser negativo.');
      return;
    }

    const umbralCheck = validarUmbral(stockMinimoAlerta);
    if (!umbralCheck.valido) {
      setError(umbralCheck.error);
      return;
    }

    setGuardando(true);

    try {
      const payload = {
        codigoInterno: codigoInterno.trim(),
        codigoBarras: codigoBarras.trim() || null,
        nombre: nombre.trim(),
        categoria,
        subcategoria: subcategoria.trim() || null,
        marca: marca.trim() || null,
        costoCompra: numCosto,
        precioVentaUnitario: numPrecioVenta,
        precioVentaMayor: Number(precioVentaMayor) || 0,
        ivaPorcentaje: Number(ivaPorcentaje) || 0,
        stockMinimoAlerta: umbralCheck.valorNormalizado
      };

      let respuesta;
      if (esEdicion) {
        respuesta = await modificarProductoApi(productoAEditar.id, payload);
      } else {
        // En creación se permite definir la cantidad inicial consolidada
        payload.stockActual = Math.max(0, parseInt(stockActual, 10) || 0);
        respuesta = await registrarProductoApi(payload);
      }

      if (respuesta && respuesta.success) {
        setExito(true);
        setTimeout(() => {
          if (onSuccess) onSuccess(respuesta.data);
          onClose();
        }, 600);
      } else {
        setError(respuesta?.message || 'Error al procesar el producto.');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(43, 24, 16, 0.6)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(43, 24, 16, 0.25)',
        border: '1.5px solid #F4E8DC',
        overflow: 'hidden'
      }}>
        {/* Cabecera del Modal */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1.5px solid #F4E8DC',
          backgroundColor: '#FFFDF7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: esEdicion ? '#FEF3C7' : '#FFEDD5',
              color: esEdicion ? '#92400E' : '#FF6600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={22} />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#2B1810'
              }}>
                {esEdicion ? 'Modificar Producto' : 'Registrar Nuevo Producto'}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#877468' }}>
                {esEdicion 
                  ? `Editando datos de ${productoAEditar.codigoInterno} · Variedades Don Mati`
                  : 'Complete los datos del producto para ingresarlo al catálogo'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            style={{
              background: 'none',
              border: 'none',
              color: '#877468',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario con scroll vertical */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Alertas de error / éxito */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              borderRadius: '12px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid #FCA5A5'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {exito && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#DCFCE7',
              color: '#166534',
              borderRadius: '12px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid #86EFAC'
            }}>
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
              <span>{esEdicion ? 'Producto actualizado correctamente.' : 'Producto registrado exitosamente.'}</span>
            </div>
          )}

          {/* Sección 1: Identificación y Clasificación */}
          <div>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#532009',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Barcode size={16} />
              Identificación y Clasificación
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {/* Código Interno */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Código Interno *
                  {esEdicion && (
                    <span style={{
                      marginLeft: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#877468',
                      backgroundColor: '#F4E8DC',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Lock size={10} /> Inmutable
                    </span>
                  )}
                </label>
                <input
                  ref={inputCodigoRef}
                  type="text"
                  required
                  disabled={esEdicion || guardando}
                  value={codigoInterno}
                  onChange={(e) => setCodigoInterno(e.target.value)}
                  placeholder="Ej: JUG-001 o Código SKU"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: esEdicion ? '#F3F4F6' : '#FFFDF7',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    color: esEdicion ? '#6B7280' : '#2B1810',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Código de Barras (Opcional) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Código de Barras (EAN / UPC)
                </label>
                <input
                  type="text"
                  disabled={guardando}
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="Escanee o ingrese código de barras"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: '#FFFDF7',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Nombre del Producto */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  disabled={guardando}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Muñeca Articulada 30cm con Accesorios"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: '#FFFDF7',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Categoría Oficial (5 fijas de Don Mati) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Categoría Oficial *
                </label>
                <select
                  value={categoria}
                  disabled={guardando}
                  onChange={(e) => setCategoria(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: '#FFFDF7',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {CATEGORIAS_OFICIALES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marca */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Marca / Fabricante
                </label>
                <input
                  type="text"
                  disabled={guardando}
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ej: Mattel, Genérico, Colgate"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: '#FFFDF7',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Precios, Costos y Márgenes (HU-0501.2) */}
          <div style={{
            backgroundColor: '#FFFDF7',
            border: '1.5px solid #F4E8DC',
            borderRadius: '14px',
            padding: '16px'
          }}>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#532009',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <DollarSign size={16} />
              Precios y Utilidades (COP)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              {/* Costo de Compra */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Costo de Compra ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  disabled={guardando}
                  value={costoCompra}
                  onChange={(e) => setCostoCompra(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Precio Venta Unitario */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Precio Venta Público ($) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  disabled={guardando}
                  value={precioVentaUnitario}
                  onChange={(e) => setPrecioVentaUnitario(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${esPrecioBajo ? '#FCA5A5' : '#F4E8DC'}`,
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Precio Venta Mayorista */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Precio al Por Mayor ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  disabled={guardando}
                  value={precioVentaMayor}
                  onChange={(e) => setPrecioVentaMayor(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* IVA % */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  IVA (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={guardando}
                  value={ivaPorcentaje}
                  onChange={(e) => setIvaPorcentaje(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Tarjeta de Cálculo Dinámico en Tiempo Real (HU-0501.2) */}
            <div style={{
              marginTop: '14px',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: esPrecioBajo ? '#FEF2F2' : '#F0FDF4',
              border: `1px solid ${esPrecioBajo ? '#FECACA' : '#BBF7D0'}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color={esPrecioBajo ? '#DC2626' : '#16A34A'} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: esPrecioBajo ? '#991B1B' : '#166534' }}>
                    Margen Estimado: <strong style={{ fontSize: '0.95rem' }}>{margenPorcentaje}%</strong>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: esPrecioBajo ? '#B91C1C' : '#15803D' }}>
                    Ganancia unitaria: <strong>{formatCOP.format(gananciaUnitaria)}</strong>
                  </div>
                </div>
              </div>

              {esPrecioBajo && (
                <div style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#B91C1C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <AlertTriangle size={14} />
                  El precio de venta es menor al costo de compra
                </div>
              )}
            </div>
          </div>

          {/* Sección 3: Control de Inventario y Existencias */}
          <div>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#532009',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Layers size={16} />
              Stock y Niveles de Alerta
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {/* Cantidad Inicial de Stock (Solo editable al crear) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  {esEdicion ? 'Stock Actual (Solo lectura)' : 'Cantidad Inicial de Unidades'}
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={esEdicion || guardando}
                  value={stockActual}
                  onChange={(e) => setStockActual(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: esEdicion ? '#F3F4F6' : '#FFFDF7',
                    fontSize: '0.9rem',
                    color: esEdicion ? '#6B7280' : '#2B1810',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {!esEdicion && (
                  <span style={{ fontSize: '0.72rem', color: '#877468', marginTop: '4px', display: 'block' }}>
                    Si recibe por caja, registre el total consolidado de unidades.
                  </span>
                )}
              </div>

              {/* Stock Mínimo para Alertas (HU-0605) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
                  Stock Mínimo para Alerta (Default: 10)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={guardando}
                  value={stockMinimoAlerta}
                  onChange={(e) => setStockMinimoAlerta(e.target.value)}
                  placeholder="10"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #F4E8DC',
                    backgroundColor: '#FFFDF7',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#877468', marginTop: '4px', display: 'block' }}>
                  Avisará en el panel cuando el stock sea menor o igual a este valor.
                </span>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '10px',
            paddingTop: '16px',
            borderTop: '1.5px solid #F4E8DC'
          }}>
            <button
              type="button"
              disabled={guardando}
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1.5px solid #D4A373',
                backgroundColor: '#FFFDF7',
                color: '#532009',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#FF6600',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: guardando ? 'not-allowed' : 'pointer',
                opacity: guardando ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(255, 102, 0, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {guardando ? (
                <>Guardando...</>
              ) : esEdicion ? (
                <>Actualizar Producto</>
              ) : (
                <>Guardar Producto</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Re-exportamos EntradaStockModal para mantener compatibilidad si se requería
export { EntradaStockModal } from './EntradaStockModal';
