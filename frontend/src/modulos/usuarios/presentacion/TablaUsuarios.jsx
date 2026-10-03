import React from 'react';
import { Users } from 'lucide-react';

export function TablaUsuarios() {
  return (
    <div style={{
      backgroundColor: '#FFF2E8',
      border: '1px dashed #FF6600',
      borderRadius: '12px',
      padding: '24px',
      textAlign: 'center',
      color: '#532009'
    }}>
      <Users size={40} style={{ margin: '0 auto 12px auto', color: '#FF6600' }} />
      <h3 style={{ fontWeight: 700, marginBottom: '6px' }}>Módulo Asignado a Juliana y Juan Camilo</h3>
      <p style={{ fontSize: '0.9rem', color: '#877468', maxWidth: '500px', margin: '0 auto' }}>
        Aquí se integrará la tabla de usuarios registrados (HU-0104), el modal de creación (HU-0101), la edición de datos (HU-0102) y la activación/desactivación de empleados (HU-0103).
      </p>
    </div>
  );
}
