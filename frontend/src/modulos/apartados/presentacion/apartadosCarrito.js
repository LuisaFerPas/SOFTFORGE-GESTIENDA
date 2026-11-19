// Lógica independiente del carrito de Apartados. No modifica el stock hasta confirmar en la API.
export const dineroApartados = (numero) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(numero) || 0);

export const normalizarBusqueda = (texto) => String(texto ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export function productoCatalogo(producto) {
  const precioVentaUnitario = Number(producto?.precioVentaUnitario ?? producto?.precio_venta_unitario);
  const stockCrudo = producto?.stockActual ?? producto?.stock_actual;
  const stockActual = stockCrudo == null ? null : Number(stockCrudo);
  return {
    id: Number(producto?.id),
    nombre: String(producto?.nombre ?? ''),
    codigoInterno: String(producto?.codigoInterno ?? producto?.codigo_interno ?? ''),
    codigoBarras: String(producto?.codigoBarras ?? producto?.codigo_barras ?? ''),
    categoria: String(producto?.categoria ?? 'General'),
    precioVentaUnitario,
    stockActual: stockActual === null ? null : (Number.isFinite(stockActual) ? Math.max(0, Math.trunc(stockActual)) : 0),
    activo: producto?.activo !== false && producto?.activo !== 0
  };
}

export function buscarEnCatalogo(catalogo, busqueda) {
  const consulta = normalizarBusqueda(busqueda);
  return catalogo.filter((p) => p.activo && normalizarBusqueda([
    p.nombre, p.codigoInterno, p.codigoBarras, p.categoria
  ].join(' ')).includes(consulta));
}

export function agregarAlApartado(actual, producto, cantidad = 1) {
  const p = productoCatalogo(producto);
  const unidades = Number(cantidad);
  if (!Number.isSafeInteger(p.id) || p.id <= 0 || !p.activo ||
      !Number.isFinite(p.precioVentaUnitario) || p.precioVentaUnitario <= 0) {
    throw new Error('El producto no está disponible para apartar.');
  }
  if (!Number.isSafeInteger(unidades) || unidades < 1) {
    throw new Error('La cantidad debe ser un entero mayor a cero.');
  }
  const existente = actual.find((item) => item.id === p.id);
  const nuevoTotal = (existente?.cantidad ?? 0) + unidades;
  if (p.stockActual !== null && nuevoTotal > p.stockActual) {
    throw new Error(`Solo hay ${p.stockActual} unidades disponibles de ${p.nombre}.`);
  }
  return existente
    ? actual.map((item) => item.id === p.id ? {...item, ...p, cantidad: nuevoTotal} : item)
    : [...actual, {...p, cantidad: unidades}];
}

export function ajustarCantidadApartado(actual, productoId, cantidad) {
  const unidades = Number(cantidad);
  if (!Number.isSafeInteger(unidades) || unidades < 1) {
    throw new Error('La cantidad debe ser un entero mayor a cero.');
  }
  return actual.map((item) => {
    if (item.id !== productoId) return item;
    if (item.stockActual !== null && unidades > item.stockActual) {
      throw new Error(`Solo hay ${item.stockActual} unidades disponibles de ${item.nombre}.`);
    }
    return {...item, cantidad: unidades};
  });
}

export function resumenApartado(items, abono) {
  const total = items.reduce((suma, item) => suma + item.precioVentaUnitario * item.cantidad, 0);
  const recibido = Number(abono);
  return {
    unidades: items.reduce((suma, item) => suma + item.cantidad, 0),
    total,
    abono: Number.isFinite(recibido) ? recibido : 0,
    saldo: Math.max(0, total - (Number.isFinite(recibido) ? recibido : 0))
  };
}
