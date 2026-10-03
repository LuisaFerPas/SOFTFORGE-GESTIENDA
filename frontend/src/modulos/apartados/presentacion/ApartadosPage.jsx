import React from 'react';
import { FileText } from 'lucide-react';

export function ApartadosPage() {
  return (
    <div>
      <div className="panel-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.6rem' }}>Gestión de Apartados</h1>
          <p style={{ color: '#877468', fontSize: '0.9rem' }}>
            Control de separados con abonos parciales y reserva de stock · HE-07
          </p>
        </div>
      </div>

      <div className="panel-card">
        <div style={{
          backgroundColor: '#FAF5FF',
          border: '1px dashed #A855F7',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: '#581C87'
        }}>
          <FileText size={40} style={{ margin: '0 auto 12px auto', color: '#9333EA' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '6px' }}>Módulo de Apartados</h3>
          <p style={{ fontSize: '0.9rem', color: '#6B7280', maxWidth: '500px', margin: '0 auto' }}>
            Aquí se integrará el registro de abonos adicionales, recibos de abono, liquidación a venta definitiva o cancelación con pérdida de abono.
          </p>
        </div>
      </div>
    </div>
  );
}
