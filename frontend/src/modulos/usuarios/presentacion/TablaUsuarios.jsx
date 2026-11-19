import { Shield, UserCheck, Users } from 'lucide-react';
import { MobileDetailCard, CampoDetalle } from '../../../compartido/componentes/MobileDetailCard';
import './usuariosResponsive.css';

// Se preserva el listado informativo original; la gestión real de cuentas no se altera.
const cuentas = [
  { id: 1, username: 'admin1', rol: 'ADMINISTRADOR', estado: 'ACTIVO', descripcion: 'Administrador Principal (Caja / Reportes)' },
  { id: 2, username: 'admin2', rol: 'ADMINISTRADOR', estado: 'ACTIVO', descripcion: 'Administrador Secundario (Soporte)' },
  { id: 3, username: 'vendedor', rol: 'VENDEDOR', estado: 'ACTIVO', descripcion: 'Operador de Mostrador y Ventas' }
];

function EtiquetaRol({ rol }) {
  const admin = rol === 'ADMINISTRADOR';
  return <span className={`dm-user-badge ${admin ? 'dm-user-badge--admin' : 'dm-user-badge--seller'}`}>
    {admin ? <Shield size={14} aria-hidden="true"/> : <UserCheck size={14} aria-hidden="true"/>}
    {admin ? 'Administrador' : 'Vendedor'}
  </span>;
}

function EtiquetaEstado({ estado }) {
  return <span className="dm-user-state">{estado === 'ACTIVO' ? 'Activo' : estado}</span>;
}

export function TablaUsuarios() {
  return <section className="dm-users" aria-labelledby="dm-users-title">
    <div className="dm-users__heading"><Users size={22} color="#bd540c" aria-hidden="true"/><h3 id="dm-users-title">Cuentas registradas en el sistema</h3></div>
    <div className="dm-desktop-only dm-users__table-wrap">
      <table className="dm-users__table">
        <thead><tr><th>Usuario</th><th>Rol</th><th>Descripción</th><th>Estado</th></tr></thead>
        <tbody>{cuentas.map(u => <tr key={u.id}>
          <td><strong>{u.username}</strong></td>
          <td><EtiquetaRol rol={u.rol}/></td>
          <td>{u.descripcion}</td>
          <td><EtiquetaEstado estado={u.estado}/></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="dm-mobile-list dm-users__cards" aria-label="Cuentas en tarjetas">
      {cuentas.map((u,i) => <MobileDetailCard key={u.id} indice={i} titulo={u.username} estado={<><EtiquetaRol rol={u.rol}/><EtiquetaEstado estado={u.estado}/></>}>
        <dl className="dm-card__fields">
          <CampoDetalle etiqueta="Descripción del perfil">{u.descripcion}</CampoDetalle>
          <CampoDetalle etiqueta="Rol">{u.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Vendedor'}</CampoDetalle>
        </dl>
      </MobileDetailCard>)}
    </div>
  </section>;
}
