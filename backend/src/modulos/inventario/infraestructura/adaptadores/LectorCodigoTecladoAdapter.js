import { ILectorCodigoPort } from '../../dominio/puertos/ILectorCodigoPort.js';

/**
 * Adaptador de Infraestructura: Lector de Código de Barras por Teclado / USB HID
 * 
 * Implementa el puerto ILectorCodigoPort para capturar eventos de entrada desde
 * un escáner de código de barras físico conectado por USB.
 * 
 * NOTA DE ARQUITECTURA:
 * La lógica detallada de captura de eventos de hardware será completada por Juliana
 * en el desarrollo del módulo de Entradas de Mercancía.
 */
export class LectorCodigoTecladoAdapter extends ILectorCodigoPort {
  constructor() {
    super();
  }

  async leerCodigo() {
    // TODO: Implementar captura física USB por Juliana
    return '';
  }

  onCodigoEscaneado(callback) {
    // TODO: Implementar listener de eventos USB por Juliana
  }
}
