/**
 * Patrón Result para DDD: encapsula éxito o fallo sin abusar de excepciones descontroladas.
 */
export class Result {
  constructor(isSuccess, error, value) {
    if (isSuccess && error) {
      throw new Error('Un resultado exitoso no puede contener un error.');
    }
    if (!isSuccess && !error) {
      throw new Error('Un resultado fallido debe contener un mensaje de error.');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this._value = value;

    Object.freeze(this);
  }

  getValue() {
    if (!this.isSuccess) {
      throw new Error(`No se puede obtener el valor de un resultado fallido: ${this.error}`);
    }
    return this._value;
  }

  static ok(value) {
    return new Result(true, null, value);
  }

  static fail(error) {
    return new Result(false, error, null);
  }
}
