import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogIn, AlertCircle, Eye, EyeOff, Smartphone } from 'lucide-react';
import { useAuth } from '../../../compartido/contexto/AuthContext';
import { loginApi } from '../servicios/authService';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [sesionExpirada, setSesionExpirada] = useState(() => {
    try { return sessionStorage.getItem('gestienda_sesion_expirada') === '1'; }
    catch { return false; }
  });
  const [loading, setLoading] = useState(false);
  const [infoRed, setInfoRed] = useState({ urlMovil: 'http://192.168.10.26:5173/' });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/sistema/red')
      .then(res => res.json())
      .then(data => {
        if (data?.success && data?.data) {
          setInfoRed(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginApi(username, password);
      login(data.data.token, data.data.user);
      setSesionExpirada(false);
      try { sessionStorage.removeItem('gestienda_sesion_expirada'); } catch { /* noop */ }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFDF7',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        border: '1px solid #F4E8DC',
        padding: '40px',
        boxShadow: '0 8px 30px rgba(83, 32, 9, 0.06)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#FF6600',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            marginBottom: '12px'
          }}>
            <Store size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2B1810', margin: '4px 0' }}>
            Don Mati
          </h1>
          <p style={{ color: '#877468', fontSize: '0.9rem' }}>
            Sistema de Gestión de Inventario y Ventas
          </p>
        </div>

        {sesionExpirada && !error && (
          <div role="status" style={{background:'#fff3dc', color:'#733f12', padding:'12px 14px', border:'1px solid #f1bf78', borderRadius:12, marginBottom:18, fontSize:'.9rem', lineHeight:1.4}}>
            Tu sesión finalizó. Inicia sesión nuevamente para seguir trabajando.
          </div>
        )}
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
              Nombre de Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid #F4E8DC',
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4A3B32', marginBottom: '6px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  borderRadius: '12px',
                  border: '1.5px solid #F4E8DC',
                  fontSize: '0.95rem',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#6B5B51',
                  fontSize: '0.9rem'
                }}
              >
                {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#FF6600',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
              boxShadow: '0 4px 14px rgba(255, 102, 0, 0.3)'
            }}
          >
            <LogIn size={20} />
            <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {infoRed?.urlMovil && (
          <div style={{
            marginTop: '20px',
            padding: '10px 14px',
            backgroundColor: '#FFF7ED',
            border: '1px solid #FFEDD5',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: '#9A3412',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <Smartphone size={16} style={{ color: '#FF6600', flexShrink: 0 }} />
            <span>
              Acceso celular en tienda: <strong>{infoRed.urlMovil}</strong>
            </span>
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: '#877468' }}>
          Variedades Don Mati · Sistema de Punto de Venta Local
        </div>
      </div>
    </div>
  );
}
