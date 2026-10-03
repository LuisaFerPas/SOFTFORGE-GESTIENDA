/**
 * Servicio de Facturación e Impresión Térmica (80mm)
 */
export class FacturacionService {
  constructor(ventaRepository, impresoraAdapter) {
    this.ventaRepository = ventaRepository;
    this.impresoraAdapter = impresoraAdapter;
  }

  async imprimirFactura(ventaId) {
    // TODO: Generar formato de ticket 80mm y enviar a impresora
  }
}
