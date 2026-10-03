import React, { useState } from 'react';
import { Users, Plus, Lock } from 'lucide-react';
import { TablaUsuarios } from './TablaUsuarios';
import { useAuth } from '../../../compartido/contexto/AuthContext.jsx';
import CambiarPasswordModal from './CambiarPasswordModal.jsx';

export function UsuariosPage() {
  // Obtenemos el usuario logueado desde el AuthContext
  const { user } = useAuth();
  
  // Estado para controlar la visibilidad del modal
  const [showCambiarPassword, setShowCambiarPassword] = useState(false);

  return (
    <div>
      <div className="panel-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ fontSize: '1.6rem' }}>Gestión de Usuarios</h1>
          <p style={{ color: '#877468', fontSize: '0.9rem' }}>
            Control de cuentas y perfiles de acceso (Administrador y Vendedor) · HE-01
          </p>
        </div>

        {/* Contenedor de botones */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          
          {/* REGLA DE NEGOCIO 2.1: Solo admin1 ve el botón de cambiar contraseñas */}
          {user?.username === 'admin1' && (
            <button 
              style={{ 
                padding: '10px 16px', 
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F97316',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              onClick={() => setShowCambiarPassword(true)}
            >
              <Lock size={18} />
              <span>Cambiar Contraseñas</span>
            </button>
          )}

          <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '0.9rem' }}>
            <Plus size={18} />
            <span>Nuevo Usuario</span>
          </button>

        </div>
      </div>

      <div className="panel-card">
        <TablaUsuarios />
      </div>

      {/* MODAL DE CAMBIO DE CONTRASEÑA */}
      {showCambiarPassword && (
        <CambiarPasswordModal onClose={() => setShowCambiarPassword(false)} />
      )}
    </div>
  );
}