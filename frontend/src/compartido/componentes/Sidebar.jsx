import React from 'react';
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
  Repeat
} from 'lucide-react';
import { useAuth } from '../contexto/AuthContext';

export function Sidebar() {
  const { user, logout, isAdmin, toggleDemoRole } = useAuth();
  const navigate = useNavigate();

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

          <NavLink to="/inventario" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Package size={18} />
            <span>Inventario</span>
          </NavLink>

          <NavLink to="/ventas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ShoppingCart size={18} />
            <span>Ventas</span>
          </NavLink>

          {/* Menú Usuarios: Exclusivo de Administrador (HU-0105) */}
          {isAdmin && (
            <NavLink to="/usuarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Usuarios</span>
            </NavLink>
          )}

          {/* Sección Reportes / Apartados */}
          {isAdmin && <div className="nav-section-label">Reportes</div>}

          {/* Menú Estadísticas: Exclusivo de Administrador (HU-0105 / RS-03) */}
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
        <button 
          onClick={toggleDemoRole}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#FCECE4',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.7rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
            width: '100%',
            justifyContent: 'center'
          }}
          title="Alternar entre Administrador y Vendedor para probar HU-0105"
        >
          <Repeat size={12} />
          <span>Ver como {isAdmin ? 'Vendedor' : 'Admin'}</span>
        </button>

        <div className="user-profile">
          <div className="user-avatar">
            {initial}
          </div>
          <div>
            <div className="user-name">{user?.username || 'Usuario'}</div>
            <div className="user-role">{roleLabel}</div>
          </div>
        </div>

        <button onClick={handleLogout} className="logout-button">
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
