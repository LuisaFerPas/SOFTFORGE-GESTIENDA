export class Reporte {
  constructor({ tipo, periodo, datos, generadoEn }) {
    this.tipo = tipo;
    this.periodo = periodo;
    this.datos = datos;
    this.generadoEn = generadoEn || new Date();
  }
}
