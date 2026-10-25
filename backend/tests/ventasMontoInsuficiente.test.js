import test from 'node:test';
import assert from 'node:assert/strict';
import { VentaService } from '../src/modulos/ventas/servicios/VentaService.js';
import { VentaController } from '../src/modulos/ventas/presentacion/ventaController.js';

const MENSAJE = 'El monto recibido es insuficiente';

function escenario() {
  let llamadasGuardar = 0;
  const repo = {
    async obtenerProductosParaVenta() {
      return [{ id: 10, nombre: 'Producto de prueba', codigoInterno: 'PR-10', precioVentaUnitario: 5500 }];
    },
    async guardar() {
      llamadasGuardar += 1;
      throw new Error('No debe intentar guardar una venta con efectivo insuficiente');
    }
  };
  return { servicio: new VentaService(repo, null), guardadas: () => llamadasGuardar };
}

test('SD-115: efectivo insuficiente devuelve el mensaje exacto y no persiste la venta', async () => {
  const { servicio, guardadas } = escenario();
  for (const montoRecibido of [100, 0, undefined]) {
    const r = await servicio.registrarVenta({
      items: [{ productoId: 10, cantidad: 2 }],
      medioPago: 'EFECTIVO',
      ...(montoRecibido !== undefined ? { montoRecibido } : {})
    }, 1);
    assert.equal(r.isFailure, true);
    assert.equal(r.error, MENSAJE);
  }
  assert.equal(guardadas(), 0);
});

test('SD-115: el controlador responde HTTP 400 sin guardar venta', async () => {
  const { servicio, guardadas } = escenario();
  const controller = new VentaController(servicio, null);
  let status, respuesta;
  const res = { status(code) { status = code; return this; }, json(body) { respuesta = body; return this; } };
  await controller.crearVenta({
    user: { id: 1, role: 'VENDEDOR' },
    body: { items: [{ productoId: 10, cantidad: 2 }], medioPago: 'EFECTIVO', montoRecibido: 100 }
  }, res);
  assert.equal(status, 400);
  assert.equal(respuesta.success, false);
  assert.equal(respuesta.message, MENSAJE);
  assert.equal(guardadas(), 0);
});
