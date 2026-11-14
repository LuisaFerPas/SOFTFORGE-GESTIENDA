export class ApartadoController {
  constructor(apartadoService) {
    this.apartadoService = apartadoService;
  }

  async crear(req, res) {
    try {
      const datos = req.body;
      const resultado = await this.apartadoService.crearApartado(datos);

      if (resultado.isFailure) {
        return res.status(400).json({ success: false, message: resultado.error });
      }

      return res.status(201).json({
        success: true,
        message: resultado.getValue().message,
        data: resultado.getValue().data
      });
    } catch (error) {
      console.error('Error en ApartadoController.crear:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

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

  async cancelar(req, res) {
    return res.status(501).json({ success: false, message: 'Funcionalidad pendiente (HU-0703).' });
  }

  async listar(req, res) {
    const resultado = await this.apartadoService.listarApartadosActivos();

    if (resultado.isFailure) {
      const { status = 500, message = 'No se pudieron consultar los apartados.' } = resultado.error ?? {};
      return res.status(status).json({ success: false, message });
    }

    return res.status(200).json({ success: true, data: resultado.getValue() });
  }
}