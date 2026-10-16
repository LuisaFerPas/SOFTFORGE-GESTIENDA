const PARES = [
  ['á','a'],['é','e'],['í','i'],['ó','o'],['ú','u'],['ü','u'],['ñ','n'],
  ['Á','a'],['É','e'],['Í','i'],['Ó','o'],['Ú','u'],['Ü','u'],['Ñ','n']
];
const NOMBRE_NORM = PARES.reduce((expr, [a, b]) => `REPLACE(${expr},'${a}','${b}')`, 'nombre');
const CATEGORIA_NORM = PARES.reduce((expr, [a, b]) => `REPLACE(${expr},'${a}','${b}')`, 'categoria');
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const escaparLike = (s) => s.replace(/[\\%_]/g, (m) => '\\' + m);

export function construirBusqueda(texto) {
  const limpio = String(texto ?? '').trim();
  const palabras = normalizar(limpio).split(/\s+/).filter(Boolean);
  const porNombre = palabras.map(() => `${NOMBRE_NORM} LIKE ? ESCAPE '\\'`).join(' AND ');
  const porCategoria = palabras.map(() => `${CATEGORIA_NORM} LIKE ? ESCAPE '\\'`).join(' AND ');
  
  return {
    condicion: `(codigo_barras = ? COLLATE NOCASE OR codigo_interno = ? COLLATE NOCASE
                 OR codigo_interno LIKE ? ESCAPE '\\' COLLATE NOCASE OR (${porNombre}) OR (${porCategoria}))`,
    parametros: [
      limpio,              // codigo_barras exacto
      limpio,              // codigo_interno exacto
      `%${escaparLike(limpio)}%`, // codigo_interno parcial
      ...palabras.map(p => `%${escaparLike(p)}%`), // palabras en nombre
      ...palabras.map(p => `%${escaparLike(p)}%`)  // palabras en categoria
    ],
    orden: `CASE WHEN codigo_barras = ? COLLATE NOCASE OR codigo_interno = ? COLLATE NOCASE THEN 0 ELSE 1 END, nombre COLLATE NOCASE`,
    parametrosOrden: [limpio, limpio]
  };
}