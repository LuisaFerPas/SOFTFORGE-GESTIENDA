import React from 'react';
import { ShoppingCart } from 'lucide-react';

export function VentasPage() {
  return (
    <div>
      <div className="panel-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.6rem' }}>Punto de Venta</h1>
          <p style={{ color: '#877468', fontSize: '0.9rem' }}>
            Carrito de compras, cobro en efectivo/Nequi/mixto e impresión térmica · HE-03, HE-04
          </p>
        </div>
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
          <ShoppingCart size={40} style={{ margin: '0 auto 12px auto', color: '#FF6600' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '6px' }}>Módulo Punto de Venta</h3>
          <p style={{ fontSize: '0.9rem', color: '#877468', maxWidth: '500px', margin: '0 auto' }}>
            Aquí se integrará el escaneo de códigos de barra, selección rápida por nombre, cálculo de cambio y factura opcional de 80mm.
          </p>
        </div>
      </div>
    </div>
  );
}
