import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './compartido/contexto/AuthContext';
import { ProtectedRoute } from './compartido/componentes/ProtectedRoute';
import { DashboardLayout } from './compartido/componentes/DashboardLayout';

// Módulos
import { LoginPage } from './modulos/auth/presentacion/LoginPage';
import { DashboardPage } from './modulos/dashboard/presentacion/DashboardPage';
import { UsuariosPage } from './modulos/usuarios/presentacion/UsuariosPage';
import { InventarioPage } from './modulos/inventario/presentacion/InventarioPage';
import { VentasPage } from './modulos/ventas/presentacion/VentasPage';
import { ApartadosPage } from './modulos/apartados/presentacion/ApartadosPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas dentro del Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/inventario" element={<InventarioPage />} />
              <Route path="/ventas" element={<VentasPage />} />
              <Route path="/apartados" element={<ApartadosPage />} />

              {/* Rutas exclusivas para el Administrador (HU-0105) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
              </Route>
            </Route>
          </Route>

          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
