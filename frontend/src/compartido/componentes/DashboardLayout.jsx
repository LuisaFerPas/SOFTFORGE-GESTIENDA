import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './responsiveShell.css';
import './mobileMenuMotion.css';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuAbierto) return;
    const alEscapar = evento => { if (evento.key === 'Escape') setMenuAbierto(false); };
    window.addEventListener('keydown', alEscapar);
    return () => window.removeEventListener('keydown', alEscapar);
  }, [menuAbierto]);
  return (
    <div className={`app-container gest-shell ${menuAbierto ? 'gest-shell--open' : ''}`}>
      <header className="gest-mobile-header">
        <strong>Don Mati <span>· Gestienda</span></strong>
        <button type="button" aria-expanded={menuAbierto} aria-controls="gest-sidebar" aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuAbierto(v => !v)}>
          {menuAbierto ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </header>
      <button className="gest-menu-overlay" aria-label="Cerrar menú de navegación" tabIndex={menuAbierto ? 0 : -1} onClick={() => setMenuAbierto(false)}/>
      <div className="gest-sidebar-holder" id="gest-sidebar"><Sidebar /></div>
      <main className="main-content" id="contenido-principal" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
