/**
 * Controlador de Apartados
 */
export class ApartadoController {
  constructor(apartadoService) {
    this.apartadoService = apartadoService;
  }

  async crear(req, res) { /* TODO */ }
  async abonar(req, res) {
    const { monto, medioPago } = req.body ?? {};
    const resultado = await this.apartadoService.registrarAbono(
      req.params.id,
      monto,
      medioPago,
      req.user?.id
    );

    if (resultado.isFailure) {
      const { status = 400, message = 'No se pudo registrar el abono.' } = resultado.error ?? {};
      return res.status(status).json({ success: false, message });
    }

    return res.status(200).json({
      success: true,
      message: 'Abono registrado correctamente.',
      data: resultado.getValue()
    });
  }
  async cancelar(req, res) { /* TODO */ }
  async listar(req, res) {
    const resultado = await this.apartadoService.listarApartadosActivos();

    if (resultado.isFailure) {
      const { status = 500, message = 'No se pudieron consultar los apartados.' } = resultado.error ?? {};
      return res.status(status).json({ success: false, message });
    }

    return res.status(200).json({ success: true, data: resultado.getValue() });
  }
}
