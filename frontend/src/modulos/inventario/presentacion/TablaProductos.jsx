import { formatCOP } from '../utilidades/formatoMoneda.js';
import { Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

const CATEGORIA_BADGES = {
  JUGUETES: 'cat-badge--juguetes',
  ASEO: 'cat-badge--aseo',
  CACHARRO: 'cat-badge--cacharro',
  MAQUILLAJE: 'cat-badge--maquillaje',
  PINATERIA: 'cat-badge--pinateria'
};

export function TablaProductos({ 
  productos = [], 
  cargando = false, 
  error = null, 
  onReintentar,
  onEditar, 
  onEliminar 
}) {
  if (cargando) {
    return (
      <div className="tabla-estado carga" style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--color-primario, #e67e22)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '0.75rem' 
      }}>
        Cargando productos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="tabla-estado error" style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--color-error, #e74c3c)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '0.75rem' 
      }}>
        <AlertTriangle size={24} />
        <p>{error}</p>
        <button 
          onClick={onReintentar} 
          style={{
            padding: '0.5rem 1rem', 
            background: 'var(--color-primario, #e67e22)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '0.25rem', 
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="tabla-estado vacio" style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--color-texto-secundario, #666)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '0.75rem' 
      }}>
        No se encontraron productos
      </div>
    );
  }

  // Detectar si viene stock (admin) o no (vendedor)
  const tieneStock = productos[0]?.stockActual !== undefined;

  return (
    <div className="tabla-wrapper" style={{ overflowX: 'auto' }}>
      <table className="tabla-productos" style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        fontSize: '0.875rem' 
      }}>
        <thead>
          <tr>
            <th style={{ 
              padding: '0.5rem 0.75rem', 
              textAlign: 'left', 
              borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
              background: 'var(--color-fondo-secundario, #f8f8f8)', 
              fontWeight: '600', 
              color: 'var(--color-texto, #333)' 
            }}>Código</th>
            <th style={{ 
              padding: '0.5rem 0.75rem', 
              textAlign: 'left', 
              borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
              background: 'var(--color-fondo-secundario, #f8f8f8)', 
              fontWeight: '600', 
              color: 'var(--color-texto, #333)' 
            }}>Producto</th>
            <th style={{ 
              padding: '0.5rem 0.75rem', 
              textAlign: 'left', 
              borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
              background: 'var(--color-fondo-secundario, #f8f8f8)', 
              fontWeight: '600', 
              color: 'var(--color-texto, #333)' 
            }}>Categoría</th>
            <th style={{ 
              padding: '0.5rem 0.75rem', 
              textAlign: 'left', 
              borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
              background: 'var(--color-fondo-secundario, #f8f8f8)', 
              fontWeight: '600', 
              color: 'var(--color-texto, #333)' 
            }}>P. Venta</th>
            <th style={{ 
              padding: '0.5rem 0.75rem', 
              textAlign: 'left', 
              borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
              background: 'var(--color-fondo-secundario, #f8f8f8)', 
              fontWeight: '600', 
              color: 'var(--color-texto, #333)' 
            }}>P. Mayor</th>
            <th style={{ 
              padding: '0.5rem 0.75rem', 
              textAlign: 'left', 
              borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
              background: 'var(--color-fondo-secundario, #f8f8f8)', 
              fontWeight: '600', 
              color: 'var(--color-texto, #333)' 
            }}>IVA</th>
            {tieneStock && (
              <th style={{ 
                padding: '0.5rem 0.75rem', 
                textAlign: 'left', 
                borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
                background: 'var(--color-fondo-secundario, #f8f8f8)', 
                fontWeight: '600', 
                color: 'var(--color-texto, #333)' 
              }}>Stock</th>
            )}
            {tieneStock && (
              <th style={{ 
                padding: '0.5rem 0.75rem', 
                textAlign: 'left', 
                borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
                background: 'var(--color-fondo-secundario, #f8f8f8)', 
                fontWeight: '600', 
                color: 'var(--color-texto, #333)' 
              }}>Mín.</th>
            )}
            <th style={{ 
              padding: '0.5rem 0.75rem', 
              textAlign: 'left', 
              borderBottom: '1px solid var(--color-borde, #e0e0e0)', 
              background: 'var(--color-fondo-secundario, #f8f8f8)', 
              fontWeight: '600', 
              color: 'var(--color-texto, #333)' 
            }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr 
              key={p.id} 
              className={`fila-producto ${p.estaAgotado ? 'agotado' : p.tieneStockBajo ? 'stock-bajo' : ''}`}
              style={{ 
                background: p.estaAgotado ? '#fff0f0' : p.tieneStockBajo ? '#fffdf0' : 'transparent'
              }}
            >
              <td className="col-codigo" style={{ 
                padding: '0.5rem 0.75rem', 
                fontFamily: 'monospace', 
                fontSize: '0.8rem', 
                color: 'var(--color-texto-secundario, #666)' 
              }}>
                {p.codigoInterno}
              </td>
              <td className="col-producto" style={{ 
                padding: '0.5rem 0.75rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.125rem' 
              }}>
                <span className="nombre" style={{ fontWeight: '500' }}>
                  {p.nombre}
                </span>
                {p.codigoBarras && (
                  <span className="codigo-barras" style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--color-texto-secundario, #999)', 
                    fontFamily: 'monospace' 
                  }}>
                    {p.codigoBarras}
                  </span>
                )}
              </td>
              <td style={{ 
                padding: '0.5rem 0.75rem' 
              }}>
                <span 
                  className={`cat-badge ${CATEGORIA_BADGES[p.categoria] || ''}`} 
                  style={{ 
                    display: 'inline-block',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    color: 'white'
                  }}
                >
                  {p.categoria}
                </span>
              </td>
              <td className="col-precio" style={{ 
                padding: '0.5rem 0.75rem', 
                whiteSpace: 'nowrap' 
              }}>
                {formatCOP.format(p.precioVentaUnitario)}
              </td>
              <td className="col-precio" style={{ 
                padding: '0.5rem 0.75rem', 
                whiteSpace: 'nowrap' 
              }}>
                {formatCOP.format(p.precioVentaMayor)}
              </td>
              <td className="col-iva" style={{ 
                padding: '0.5rem 0.75rem', 
                textAlign: 'center' 
              }}>
                {p.ivaPorcentaje}%
              </td>
              {tieneStock && (
                <td className="col-stock" style={{ 
                  padding: '0.5rem 0.75rem', 
                  textAlign: 'center', 
                  fontVariantNumeric: 'tabular-nums' 
                }}>
                  <span 
                    className={p.estaAgotado ? 'stock-cero' : p.tieneStockBajo ? 'stock-bajo' : ''} 
                    style={{ 
                      color: p.estaAgotado ? 'var(--color-error, #e74c3c)' : p.tieneStockBajo ? 'var(--color-advertencia, #f39c12)' : 'inherit',
                      fontWeight: p.estaAgotado || p.tieneStockBajo ? '600' : 'normal'
                    }}
                  >
                    {p.stockActual}
                    {p.estaAgotado && (
                      <CheckCircle 
                        size={14} 
                        className="icono-agotado" 
                        style={{ 
                          color: 'var(--color-error, #e74c3c)', 
                          marginLeft: '0.25rem' 
                        }}
                      />
                    )}
                    {p.tieneStockBajo && !p.estaAgotado && (
                      <AlertTriangle 
                        size={14} 
                        className="icono-bajo" 
                        style={{ 
                          color: 'var(--color-advertencia, #f39c12)', 
                          marginLeft: '0.25rem' 
                        }}
                      />
                    )}
                  </span>
                </td>
              )}
              {tieneStock && (
                <td className="col-min" style={{ 
                  padding: '0.5rem 0.75rem', 
                  textAlign: 'center' 
                }}>
                  {p.stockMinimoAlerta}
                </td>
              )}
              <td className="col-acciones" style={{ 
                padding: '0.5rem 0.75rem', 
                display: 'flex', 
                gap: '0.25rem' 
              }}>
                {onEditar && (
                  <button 
                    className="btn-accion editar" 
                    onClick={() => onEditar(p)} 
                    title="Editar"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '0.25rem',
                      color: 'var(--color-texto-secundario, #666)',
                      transition: 'background 0.15s, color 0.15s'
                    }}
                  >
                    <Edit size={16} />
                  </button>
                )}
                {onEliminar && (
                  <button 
                    className="btn-accion eliminar" 
                    onClick={() => onEliminar(p)} 
                    title="Dar de baja"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '0.25rem',
                      color: 'var(--color-texto-secundario, #666)',
                      transition: 'background 0.15s, color 0.15s'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}