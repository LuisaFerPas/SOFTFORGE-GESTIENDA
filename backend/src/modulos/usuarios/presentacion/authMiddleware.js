import jwt from 'jsonwebtoken';

// Validación de variable de entorno obligatoria
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no configurado. Defínalo en .env');
}

export const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware para verificar el token JWT
 * Inyecta el usuario decodificado en req.user
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

/**
 * Middleware para verificar roles específicos
 * Útil para futuras rutas que requieran permisos especiales
 */
export function requireRole(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Permisos insuficientes' });
    }
    next();
  };
}