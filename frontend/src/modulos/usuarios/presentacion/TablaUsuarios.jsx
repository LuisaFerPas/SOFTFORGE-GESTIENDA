import React from 'react';
import { Users, Shield, UserCheck } from 'lucide-react';

export function TablaUsuarios() {
  const usuariosFijos = [
    { id: 1, username: 'admin1', rol: 'ADMINISTRADOR', estado: 'ACTIVO', descripcion: 'Administrador Principal (Caja / Reportes)' },
    { id: 2, username: 'admin2', rol: 'ADMINISTRADOR', estado: 'ACTIVO', descripcion: 'Administrador Secundario (Soporte)' },
    { id: 3, username: 'vendedor', rol: 'VENDEDOR', estado: 'ACTIVO', descripcion: 'Operador de Mostrador y Ventas' }
  ];

  return (
    <div style={{ backgroundColor: '#FFFDF7', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Users size={22} style={{ color: '#FF6600' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2937' }}>
          Cuentas Registradas en el Sistema
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB', color: '#4B5563' }}>
              <th style={{ padding: '12px' }}>Usuario</th>
              <th style={{ padding: '12px' }}>Rol</th>
              <th style={{ padding: '12px' }}>Descripción</th>
              <th style={{ padding: '12px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFijos.map(usr => (
              <tr key={usr.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#111827' }}>
                  {usr.username}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: usr.rol === 'ADMINISTRADOR' ? '#FEF3C7' : '#DBEAFE',
                    color: usr.rol === 'ADMINISTRADOR' ? '#92400E' : '#1E40AF'
                  }}>
                    {usr.rol === 'ADMINISTRADOR' ? <Shield size={12} /> : <UserCheck size={12} />}
                    {usr.rol}
                  </span>
                </td>
                <td style={{ padding: '12px', color: '#6B7280' }}>
                  {usr.descripcion}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: '#DCFCE7',
                    color: '#166534'
                  }}>
                    {usr.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
