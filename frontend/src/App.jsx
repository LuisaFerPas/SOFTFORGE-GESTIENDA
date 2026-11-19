import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './compartido/contexto/AuthContext';
import { ProtectedRoute } from './compartido/componentes/ProtectedRoute';
import { DashboardLayout } from './compartido/componentes/DashboardLayout';
import './compartido/componentes/routeLoading.css';

// MÃ³dulos
const LoginPage = lazy(() => import('./modulos/auth/presentacion/LoginPage').then(mod => ({ default: mod.LoginPage })));
const DashboardPage = lazy(() => import('./modulos/dashboard/presentacion/DashboardPage').then(mod => ({ default: mod.DashboardPage })));
const UsuariosPage = lazy(() => import('./modulos/usuarios/presentacion/UsuariosPage').then(mod => ({ default: mod.UsuariosPage })));
const InventarioPage = lazy(() => import('./modulos/inventario/presentacion/InventarioPage').then(mod => ({ default: mod.InventarioPage })));
const VentasPage = lazy(() => import('./modulos/ventas/presentacion/VentasPage').then(mod => ({ default: mod.VentasPage })));
const HistorialFacturasPage = lazy(() => import('./modulos/ventas/presentacion/HistorialFacturasPage').then(mod => ({ default: mod.HistorialFacturasPage })));
const ApartadosPage = lazy(() => import('./modulos/apartados/presentacion/ApartadosPage').then(mod => ({ default: mod.ApartadosPage })));
const EstadisticasPage = lazy(() => import('./modulos/estadisticas/presentacion/EstadisticasPage').then(mod => ({ default: mod.EstadisticasPage })));

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<main className="gest-route-loading" role="status" aria-live="polite">Cargando Gestienda…</main>}>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rutas protegidas dentro del Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Rutas accesibles para todos los roles autenticados */}
              <Route path="/ventas" element={<VentasPage />} />
              <Route path="/ventas/facturas" element={<HistorialFacturasPage />} />
              <Route path="/apartados" element={<ApartadosPage />} />

              {/* Rutas exclusivas para el Administrador */}
              <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
                <Route path="/inventario" element={<InventarioPage />} />
                <Route path="/usuarios" element={<UsuariosPage />} />
                <Route path="/estadisticas" element={<EstadisticasPage />} />
              </Route>
            </Route>
          </Route>

          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
