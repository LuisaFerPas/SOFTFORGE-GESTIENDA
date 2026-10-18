/**
 * Puerto de Dominio (Arquitectura Hexagonal): Lector de Código de Barras
 * 
 * Define el contrato abstracto para la captura de códigos de productos.
 * Permite desacoplar el sistema del dispositivo físico (lector USB, emulador o entrada manual).
 * 
 * NOTA DE ARQUITECTURA:
 * La implementación concreta de este puerto y sus adaptadores será realizada
 * por Juliana durante el desarrollo de las Historias de Usuario de Entradas de Mercancía (HU-0601).
 */
export class ILectorCodigoPort {
  /**
   * Lee o captura un código de barras.
   * @returns {Promise<string>} Código leído
   */
  async leerCodigo() {
    throw new Error('Método de puerto ILectorCodigoPort no implementado');
  }

  /**
   * Suscribe un callback ante eventos de escaneo continuo.
   * @param {Function} callback 
   */
  onCodigoEscaneado(callback) {
    throw new Error('Método de puerto ILectorCodigoPort no implementado');
  }
}
