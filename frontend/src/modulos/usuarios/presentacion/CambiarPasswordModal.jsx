import React, { useState } from 'react';
import { cambiarPasswordApi } from '../servicios/usuarioService.js';

const CambiarPasswordModal = ({ onClose }) => {
  const [targetUser, setTargetUser] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });

    // 1. Validaciones en el cliente
    if (newPassword !== confirmPassword) {
      setMensaje({ texto: 'Las contraseñas no coinciden.', tipo: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setMensaje({ texto: 'La contraseña debe tener al menos 6 caracteres.', tipo: 'error' });
      return;
    }

    setCargando(true);

    try {
      // 2. Llamada al servicio (que ya conecta con el backend)
      await cambiarPasswordApi(targetUser, newPassword);
      
      setMensaje({ texto: `Contraseña de ${targetUser} actualizada con éxito`, tipo: 'exito' });
      setTargetUser('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
      
    } catch (error) {
      setMensaje({ texto: `${error.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

   const styles = {
    overlay: { 
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', 
      alignItems: 'center', zIndex: 1000 
    },
    modal: { 
      backgroundColor: 'white', padding: '30px', borderRadius: '16px', 
      width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
    },
    title: { color: '#5C2C0A', marginBottom: '20px', textAlign: 'center' },
    label: { color: '#5C2C0A', fontWeight: 'bold', marginBottom: '5px', display: 'block' },
    input: { 
      width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #FDE047', 
      backgroundColor: '#FFFDF5', marginBottom: '15px', fontSize: '14px', 
      outline: 'none', boxSizing: 'border-box' 
    },
    select: { 
      width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #FDE047', 
      backgroundColor: '#FFFDF5', marginBottom: '15px', fontSize: '14px', outline: 'none' 
    },
    button: { 
      width: '100%', padding: '12px', borderRadius: '8px', border: 'none', 
      backgroundColor: '#FDE047', color: '#5C2C0A', fontWeight: 'bold', 
      fontSize: '16px', cursor: 'pointer' 
    },
    buttonDisabled: {
      opacity: 0.6, cursor: 'not-allowed'
    },
    passwordWrapper: { position: 'relative' },
    toggleBtn: { 
      position: 'absolute', right: '10px', top: '12px', background: 'none', 
      border: 'none', cursor: 'pointer', color: '#F97316' 
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Actualizar Contraseña</h2>
        <form onSubmit={handleSubmit}>
          
          <label style={styles.label}>Seleccionar Usuario:</label>
          <select 
            style={styles.select} 
            value={targetUser} 
            onChange={(e) => setTargetUser(e.target.value)} 
            required
          >
            <option value="">-- Seleccione --</option>
            <option value="admin1">admin1</option>
            <option value="admin2">admin2</option>
            <option value="vendedor">vendedor</option>
          </select>

          <label style={styles.label}>Nueva Contraseña:</label>
          <div style={styles.passwordWrapper}>
            <input 
              type={showPassword ? "text" : "password"} 
              style={styles.input} 
              placeholder="Mínimo 6 caracteres" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
            />
            <button 
              type="button" 
              style={styles.toggleBtn} 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "" : "👁️"}
            </button>
          </div>

          <label style={styles.label}>Confirmar Nueva Contraseña:</label>
          <input 
            type={showPassword ? "text" : "password"} 
            style={styles.input} 
            placeholder="Repita la contraseña" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
          />

          {mensaje.texto && (
            <p style={{ 
              color: mensaje.tipo === 'exito' ? '#16A34A' : '#DC2626', 
              textAlign: 'center', marginBottom: '15px', fontWeight: 'bold' 
            }}>
              {mensaje.texto}
            </p>
          )}

          <button 
            type="submit" 
            style={{...styles.button, ...(cargando ? styles.buttonDisabled : {})}} 
            disabled={cargando}
          >
            {cargando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          
          <button 
            type="button" 
            onClick={onClose} 
            style={{
              ...styles.button, 
              backgroundColor: 'transparent', 
              color: '#5C2C0A', 
              marginTop: '10px',
              border: '1px solid #FDE047'
            }}
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
};

export default CambiarPasswordModal;