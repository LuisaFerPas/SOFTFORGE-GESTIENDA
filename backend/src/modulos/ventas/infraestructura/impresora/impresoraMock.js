/**
 * Interfaz (Puerto) para la impresora térmica.
 * HU-0402.3: Documentación del contrato.
 * 
 * @interface IImpresoraTermicaPort
 */
export class IImpresoraTermicaPort {
  /**
   * Imprime un ticket en formato ESC/POS simulado.
   * @param {Object} ticket - Objeto con los datos a imprimir.
   * @param {string} ticket.encabezado - Nombre de la tienda, dirección, etc.
   * @param {Array<{nombre: string, cantidad: number, precio: number, subtotal: number}>} ticket.items - Lista de productos vendidos.
   * @param {number} ticket.total - Total a pagar.
   * @param {string} ticket.pie - Mensaje de despedida o agradecimiento.
   * @param {string} [ticket.cliente] - Nombre del cliente (opcional).
   * @throws {Error} Si hay un error de conexión con la impresora.
   */
  imprimirFactura(ticket) {
    throw new Error('Método no implementado');
  }
}

/**
 * Implementación Mock (Simulada) de la impresora.
 * HU-0402.2: Simula el formato ESC/POS imprimiéndolo en la consola.
 */
export class ImpresoraMockAdapter extends IImpresoraTermicaPort {
  imprimirFactura(ticket) {
    try {
      console.log("\n==============================================");
      console.log("           VARIEDADES DON MATI                ");
      console.log("         Popayán, Colombia                    ");
      console.log("==============================================");
      console.log(`Fecha: ${new Date().toLocaleString()}`);
      console.log(`Cliente: ${ticket.cliente || 'Consumidor Final'}`);
      console.log("----------------------------------------------");
      console.log("CANT  DESCRIPCIÓN                 P.UNIT   SUBTOTAL");
      
      ticket.items.forEach(item => {
        const cant = item.cantidad.toString().padEnd(5);
        const desc = item.nombre.substring(0, 25).padEnd(25);
        const precio = item.precio.toFixed(0).padStart(6);
        const subtotal = item.subtotal.toFixed(0).padStart(8);
        console.log(`${cant} ${desc} ${precio} ${subtotal}`);
      });

      console.log("----------------------------------------------");
      console.log(`TOTAL:                              $ ${ticket.total.toFixed(0)}`);
      console.log("==============================================");
      console.log("         ¡Gracias por su compra!              ");
      console.log("==============================================\n");

      return true;
    } catch (error) {
      console.error("Error en la impresora:", error);
      throw new Error("Fallo al conectar con la impresora térmica.");
    }
  }
}