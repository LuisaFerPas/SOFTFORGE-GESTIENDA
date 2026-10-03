import React from 'react';
import { Package, Plus } from 'lucide-react';

export function InventarioPage() {
  return (
    <div>
      <div className="panel-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.6rem' }}>Inventario de Productos</h1>
          <p style={{ color: '#877468', fontSize: '0.9rem' }}>
            Catálogo de productos, control de stock y entradas de mercancía · HE-05, HE-06
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '0.9rem' }}>
          <Plus size={18} />
          <span>Agregar Producto</span>
        </button>
      </div>

      <div className="panel-card">
        <div style={{
          backgroundColor: '#FFF8F0',
          border: '1px dashed #E0975F',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: '#532009'
        }}>
          <Package size={40} style={{ margin: '0 auto 12px auto', color: '#FF6600' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '6px' }}>Módulo de Inventario</h3>
          <p style={{ fontSize: '0.9rem', color: '#877468', maxWidth: '500px', margin: '0 auto' }}>
            Aquí se integrará el CRUD de productos con las 5 categorías fijas (Juguetes, Aseo, Cacharro, Maquillaje, Piñatería) y el historial de entradas de mercancía.
          </p>
        </div>
      </div>
    </div>
  );
}
