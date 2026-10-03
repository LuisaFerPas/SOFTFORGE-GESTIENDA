import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, X, Repeat, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { switchUserApi } from '../servicios/authService';

/**
 * Cambio Rápido de Cajero
 * Permite al Administrador ceder la caja a otro usuario autenticado
 * sin necesidad de cerrar sesión ni reiniciar el sistema.
 */
export function CambioUsuarioModal({ isOpen, onClose }) {
  const { cambiarUsuario } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Limpiar el formulario cada vez que el modal se abre
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError('');
      setExito('');
      setMostrarPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (!username.trim() || !password.trim()) {
      setError('Usuario y contraseña son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const data = await switchUserApi(username.trim(), password);

      if (!data.success) {
        setError(data.message || 'Usuario o contraseña inválidos');
        return;
      }

      // Actualizar sesión global con el nuevo usuario
      cambiarUsuario(data.data.token, data.data.user);

      setExito(`Sesión cedida a "${data.data.user.username}" correctamente`);

      // Cerrar el modal después de 1.2s para que el usuario aprecie la notificación
      setTimeout(() => onClose(), 1200);

    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Overlay */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(2px)'
      }}
    >
      {/* Card del Modal */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(83, 32, 9, 0.18)',
        position: 'relative',
        animation: 'fadeInScale 0.2s ease'
      }}>

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9CA3AF',
            padding: '4px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#FFF2E8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF6600'
          }}>
            <Repeat size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2B1810', lineHeight: 1.2 }}>
              Cambio Rápido de Cajero
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#877468', marginTop: '2px' }}>
              HU-0203 · Sin cerrar la sesión del sistema
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '20px', marginTop: '4px' }}>
          Ingresa las credenciales del nuevo cajero para cederle el acceso.
        </p>

        <form onSubmit={handleSubmit}>

          {/* Mensaje de error */}
          {error && (
            <div style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#DC2626',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Mensaje de éxito */}
          {exito && (
            <div style={{
              backgroundColor: '#D1FAE5',
              border: '1px solid #A7F3D0',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#065F46',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{exito}</span>
            </div>
          )}

          {/* Campo Usuario */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#4A3B32',
              marginBottom: '6px'
            }}>
              Nombre de Usuario
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                  pointerEvents: 'none'
                }}
              />
              <input
                id="switch-username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="usuario"
                autoComplete="off"
                disabled={loading || !!exito}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: `1.5px solid ${error ? '#FECACA' : '#F0E0D0'}`,
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  color: '#2B1810',
                  outline: 'none',
                  backgroundColor: loading ? '#F9FAFB' : '#FFFAF7',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#4A3B32',
              marginBottom: '6px'
            }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                  pointerEvents: 'none'
                }}
              />
              <input
                id="switch-password"
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                disabled={loading || !!exito}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 36px',
                  border: `1.5px solid ${error ? '#FECACA' : '#F0E0D0'}`,
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  color: '#2B1810',
                  outline: 'none',
                  backgroundColor: loading ? '#F9FAFB' : '#FFFAF7',
                  transition: 'border-color 0.2s'
                }}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  display: 'flex',
                  padding: '4px'
                }}
              >
                {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '11px',
                border: '1.5px solid #F0E0D0',
                borderRadius: '10px',
                background: 'none',
                color: '#877468',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-confirmar-cambio"
              disabled={loading || !!exito}
              style={{
                flex: 1,
                padding: '11px',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: loading || exito ? '#FDA06E' : '#FF6600',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: (loading || exito) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s',
                boxShadow: '0 4px 14px rgba(255, 102, 0, 0.25)'
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite'
                  }} />
                  Verificando...
                </>
              ) : (
                <>
                  <Repeat size={16} />
                  Cambiar cajero
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Animaciones */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
