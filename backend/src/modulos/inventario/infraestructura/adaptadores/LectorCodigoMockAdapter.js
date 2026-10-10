import { ILectorCodigoPort } from '../../dominio/puertos/ILectorCodigoPort.js';

/**
 * Adaptador de Infraestructura: Simulador Mock de Lector de Código de Barras
 * 
 * Implementa el puerto ILectorCodigoPort permitiendo simular lecturas para
 * pruebas automatizadas o sustentaciones académicas sin dispositivo físico conectado.
 */
export class LectorCodigoMockAdapter extends ILectorCodigoPort {
  constructor(codigosSimulados = []) {
    super();
    this.codigosSimulados = codigosSimulados;
  }

  async leerCodigo() {
    if (this.codigosSimulados.length > 0) {
      return this.codigosSimulados.shift();
    }
    return '7701234567890';
  }

  onCodigoEscaneado(callback) {
    // Simulación de escaneo para testing
  }
}
