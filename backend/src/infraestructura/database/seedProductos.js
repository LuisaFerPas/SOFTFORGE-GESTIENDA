import { CategoriaProducto as C } from '../../modulos/inventario/dominio/CategoriaProducto.js';

/** Catálogo EXCLUSIVAMENTE de prueba. No contiene información real del cliente. */
export const PRODUCTOS_DEMO = Object.freeze([
  // Juguetes
  ['DEMO-JUG-001', 'Carro de juguete', C.JUGUETES, 5500, 9000, 18, 5],
  ['DEMO-JUG-002', 'Pelota pequeña', C.JUGUETES, 3500, 6500, 3, 5],
  ['DEMO-JUG-003', 'Muñeca de plástico', C.JUGUETES, 11000, 17000, 0, 5],
  ['DEMO-JUG-004', 'Juego de plastilina', C.JUGUETES, 4500, 8500, 25, 8],
  // Aseo
  ['DEMO-ASE-001', 'Esponja de cocina', C.ASEO, 1000, 2000, 4, 10],
  ['DEMO-ASE-002', 'Escoba doméstica', C.ASEO, 6000, 10500, 0, 6],
  ['DEMO-ASE-003', 'Recogedor plástico', C.ASEO, 3500, 6500, 15, 5],
  ['DEMO-ASE-004', 'Paño de limpieza', C.ASEO, 1500, 3000, 5, 10],
  // Cacharro
  ['DEMO-CAC-001', 'Vaso plástico', C.CACHARRO, 1300, 2500, 0, 10],
  ['DEMO-CAC-002', 'Recipiente con tapa', C.CACHARRO, 4400, 8000, 17, 8],
  ['DEMO-CAC-003', 'Colador plástico', C.CACHARRO, 2500, 5000, 2, 7],
  ['DEMO-CAC-004', 'Pinzas de ropa x 12', C.CACHARRO, 2200, 4500, 0, 5],
  // Maquillaje
  ['DEMO-MAQ-001', 'Brillo labial', C.MAQUILLAJE, 3500, 6500, 3, 4],
  ['DEMO-MAQ-002', 'Esmalte de uñas', C.MAQUILLAJE, 2800, 5500, 0, 6],
  ['DEMO-MAQ-003', 'Lápiz delineador', C.MAQUILLAJE, 3100, 6200, 3, 6],
  // Piñatería
  ['DEMO-PIN-001', 'Globos de colores x 12', C.PINATERIA, 3000, 6000, 30, 10],
  ['DEMO-PIN-002', 'Velas de cumpleaños', C.PINATERIA, 1200, 2500, 0, 5],
  ['DEMO-PIN-003', 'Serpentina decorativa', C.PINATERIA, 1800, 3600, 17, 5]
].map(([codigoInterno, nombre, categoria, costoCompra, precioVentaUnitario, stockActual, stockMinimoAlerta]) =>
  Object.freeze({ codigoInterno, nombre, categoria, costoCompra, precioVentaUnitario, stockActual, stockMinimoAlerta })
));

/** Inserta exclusivamente productos DEMO ausentes; no altera inventarios preexistentes. */
export function seedProductos(db) {
  if (!db?.prepare) throw new TypeError('Se requiere conexión SQLite inicializada.');
  const existe = db.prepare('SELECT id FROM products WHERE codigo_interno = ? COLLATE NOCASE');
  const insertar = db.prepare(`
    INSERT INTO products (codigo_interno, nombre, categoria, costo_compra,
      precio_venta_unitario, iva_porcentaje, stock_actual, stock_minimo_alerta, activo)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1)
  `);
  let insertados = 0;
  let existentes = 0;
  // Transacción evita quedar con un catálogo incompleto si ocurre algún error.
  db.exec('BEGIN TRANSACTION');
  try {
    for (const p of PRODUCTOS_DEMO) {
      if (existe.get(p.codigoInterno)) { existentes++; continue; }
      insertar.run(p.codigoInterno, p.nombre, p.categoria, p.costoCompra,
        p.precioVentaUnitario, p.stockActual, p.stockMinimoAlerta);
      insertados++;
    }
    db.exec('COMMIT');
    return { insertados, existentes, totalCatalogo: PRODUCTOS_DEMO.length };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
