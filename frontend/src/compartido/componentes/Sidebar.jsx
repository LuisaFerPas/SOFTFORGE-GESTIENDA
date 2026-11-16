import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Store, 
  LayoutGrid, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart2, 
  FileText, 
  LogOut,
  Repeat,
  ReceiptText,
  Wifi
} from 'lucide-react';
import { useAuth } from '../contexto/AuthContext';
import { CambioUsuarioModal } from '../../modulos/auth/presentacion/CambioUsuarioModal';

export function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [urlMovil, setUrlMovil] = useState('');

  useEffect(() => {
    fetch('/api/sistema/red')
      .then(res => res.json())
      .then(data => {
        if (data?.success && data?.data?.urlMovil) {
          setUrlMovil(data.data.urlMovil);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'A';
  const roleLabel = user?.role === 'ADMINISTRADOR' ? 'Administrador' : 'Vendedor';

  return (
    <aside className="sidebar">
      <div>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Store size={22} />
          </div>
          <div>
            <div className="brand-title">Don Mati</div>
            <div className="brand-subtitle">Popayán</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutGrid size={18} />
            <span>Inicio</span>
          </NavLink>

          {/* Menú Inventario: Exclusivo de Administrador */}
          {isAdmin && (
            <NavLink to="/inventario" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Package size={18} />
              <span>Inventario</span>
            </NavLink>
          )}

          <NavLink to="/ventas" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ShoppingCart size={18} />
            <span>Ventas</span>
          </NavLink>

          <NavLink to="/ventas/facturas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ReceiptText size={18} />
            <span>Facturas</span>
          </NavLink>

          {/* Menú Usuarios: Exclusivo de Administrador */}
          {isAdmin && (
            <NavLink to="/usuarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Usuarios</span>
            </NavLink>
          )}

          {/* Sección Reportes / Apartados */}
          {isAdmin && <div className="nav-section-label">Reportes</div>}

          {/* Menú Estadísticas: Exclusivo de Administrador */}
          {isAdmin && (
            <NavLink to="/estadisticas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BarChart2 size={18} />
              <span>Estadísticas</span>
            </NavLink>
          )}

          <NavLink to="/apartados" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={18} />
            <span>Apartados</span>
          </NavLink>
        </nav>
      </div>

      {/* Footer con Usuario y Salida */}
      <div className="sidebar-footer">
        {urlMovil && (
          <div style={{
            padding: '6px 10px',
            backgroundColor: '#FFF7ED',
            border: '1px solid #FFEDD5',
            borderRadius: '8px',
            fontSize: '0.72rem',
            color: '#9A3412',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }} title="Enlace para celulares en la misma red Wi-Fi">
            <Wifi size={13} style={{ color: '#FF6600', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
              {urlMovil}
            </span>
          </div>
        )}

        <div className="user-profile">
          <div className="user-avatar">
            {initial}
          </div>
          <div>
            <div className="user-name">{user?.username || 'Usuario'}</div>
            <div className="user-role">{roleLabel}</div>
          </div>
        </div>

        {/* Botón Cambio Rápido de Cajero */}
        <button
          onClick={() => setModalAbierto(true)}
          className="logout-button"
          style={{ marginBottom: '6px' }}
          title="Cambiar de cajero sin cerrar sesión"
        >
          <Repeat size={16} />
          <span>Cambiar cajero</span>
        </button>

        <button onClick={handleLogout} className="logout-button">
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      {/* Modal de Cambio Rápido de Cajero */}
      <CambioUsuarioModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
      />
    </aside>
  );
}

