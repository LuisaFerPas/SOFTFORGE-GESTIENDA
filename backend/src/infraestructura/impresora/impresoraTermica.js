/**
 * Adaptador de Impresora Térmica (80mm ESC/POS)
 */
export class ImpresoraTermicaAdapter {
  async imprimirTicketVenta(datosTicket) {
    console.log('[Impresora] Imprimiendo ticket de venta...');
    // TODO: Implementar comandos ESC/POS sobre puerto USB
  }

  async imprimirComprobanteAbono(datosAbono) {
    console.log('[Impresora] Imprimiendo comprobante de abono...');
    // TODO: Implementar comandos ESC/POS sobre puerto USB
  }
}
