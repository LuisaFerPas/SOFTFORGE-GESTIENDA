import React, { useState } from 'react';
import { User, Trash2, ShoppingBag, Plus } from 'lucide-react';
import { InputCodigoBarras } from '../../ventas/presentacion/componentes/InputCodigoBarras';
import { BuscadorNombre } from '../../ventas/presentacion/componentes/BuscadorNombre';
import { buscarProductoPorCodigo, buscarProductosPorNombre } from '../../ventas/servicios/ventasService';
import { crearApartado } from '../servicios/apartadosService';

export function CrearApartadoModal({ onCreado }) {
  const [clienteNombre, setClienteNombre] = useState('');
  const [productos, setProductos] = useState([]);
  const [abonoInicial, setAbonoInicial] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(null);

  const total = productos.reduce((sum, p) => sum + (p.precioVentaUnitario * p.cantidad), 0);
  const saldo = total - (Number(abonoInicial) || 0);

  const agregarProducto = (producto) => {
    setProductos((prev) => {
      const existe = prev.find((p) => p.id === producto.id);
      if (existe) {
        return prev.map((p) => p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    setError('');
  };

  const handleEscanear = async (codigo) => {
    try {
      const res = await buscarProductoPorCodigo(codigo);
      if (res.data) agregarProducto(res.data);
    } catch (err) {
      throw new Error('Producto no encontrado');
    }
  };

  const handleBuscarNombre = async (nombre) => {
    try {
      const res = await buscarProductosPorNombre(nombre);
      return res.data || [];
    } catch (err) {
      return [];
    }
  };

  const cambiarCantidad = (id, cantidad) => {
    const cant = Number(cantidad);
    if (cant < 1) return;
    setProductos((prev) => prev.map((p) => p.id === id ? { ...p, cantidad: cant } : p));
  };

  const eliminarProducto = (id) => {
    setProductos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clienteNombre.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    if (productos.length === 0) {
      setError('Debe agregar al menos un producto.');
      return;
    }
    const abono = Number(abonoInicial);
    if (isNaN(abono) || abono <= 0) {
      setError('El abono inicial debe ser mayor a cero.');
      return;
    }
    if (abono > total) {
      setError('El abono no puede ser mayor al total.');
      return;
    }

    setGuardando(true);

    try {
      const payload = {
        clienteNombre,
        abonoInicial: abono,
        productos: productos.map((p) => ({ productoId: p.id, cantidad: p.cantidad }))
      };

      const respuesta = await crearApartado(payload);
      
      setExito(respuesta.data);
      setClienteNombre('');
      setProductos([]);
      setAbonoInicial('');
      
      setTimeout(() => {
        if (onCreado) onCreado();
      }, 2500);

    } catch (err) {
      const mensaje = err.message || 'Error al crear el apartado.';
      setError(mensaje);
      // HU-0701.6: Resaltar producto si el error menciona stock
      if (mensaje.toLowerCase().includes('stock insuficiente') || mensaje.toLowerCase().includes('no disponible')) {
        // En un caso real, aquí podríamos identificar el producto por nombre y ponerle un estado de error
      }
    } finally {
      setGuardando(false);
    }
  };

  if (exito) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#FFFDF7', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ color: '#059669', marginBottom: '8px' }}>¡Apartado Creado!</h2>
        <p style={{ color: '#4B5563', marginBottom: '16px' }}>El apartado #{exito.id} se ha registrado correctamente.</p>
        <button onClick={() => setExito(null)} style={{ padding: '8px 16px', backgroundColor: '#FF6600', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Crear otro apartado
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1F2937', marginBottom: '20px' }}>Registrar Nuevo Apartado</h2>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold' }}>Error:</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Nombre del Cliente *</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9CA3AF' }} />
            <input 
              type="text" 
              placeholder="Ej: Laura Martínez" 
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 34px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem', outline: 'none' }}
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px', padding: '16px', border: '1px dashed #D1D5DB', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Agregar Productos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <InputCodigoBarras onBuscar={handleEscanear} deshabilitado={guardando} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>— O busca por nombre —</span>
            </div>
            <BuscadorNombre onBuscar={handleBuscarNombre} onSeleccionar={agregarProducto} />
          </div>
        </div>

        {productos.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Productos Seleccionados</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Producto</th>
                  <th style={{ padding: '8px' }}>Cantidad</th>
                  <th style={{ padding: '8px' }}>Precio</th>
                  <th style={{ padding: '8px' }}>Subtotal</th>
                  <th style={{ padding: '8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ padding: '8px' }}>
                      <input 
                        type="number" min="1" value={p.cantidad} 
                        onChange={(e) => cambiarCantidad(p.id, e.target.value)}
                        style={{ width: '60px', padding: '4px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>${p.precioVentaUnitario}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>${p.precioVentaUnitario * p.cantidad}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button type="button" onClick={() => eliminarProducto(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Abono Inicial *</label>
            <input 
              type="number" 
              placeholder="$" 
              value={abonoInicial}
              onChange={(e) => setAbonoInicial(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '1rem', fontWeight: 600, color: '#059669', outline: 'none' }}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Total: <b>${total}</b></div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FF6600' }}>Saldo: ${saldo > 0 ? saldo : 0}</div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={guardando}
          style={{ width: '100%', padding: '12px', backgroundColor: guardando ? '#9CA3AF' : '#FF6600', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: guardando ? 'not-allowed' : 'pointer' }}
        >
          {guardando ? 'Procesando...' : 'Crear Apartado'}
        </button>
      </form>
    </div>
  );
}