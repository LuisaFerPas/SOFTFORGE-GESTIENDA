import React from 'react';
import { Users, Plus } from 'lucide-react';
import { TablaUsuarios } from './TablaUsuarios';

export function UsuariosPage() {
  return (
    <div>
      <div className="panel-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.6rem' }}>Gestión de Usuarios</h1>
          <p style={{ color: '#877468', fontSize: '0.9rem' }}>
            Control de cuentas y perfiles de acceso (Administrador y Vendedor) · HE-01
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '0.9rem' }}>
          <Plus size={18} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="panel-card">
        <TablaUsuarios />
      </div>
    </div>
  );
}
