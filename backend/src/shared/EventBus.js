import { EventEmitter } from 'node:events';

/**
 * Bus de Eventos en memoria para comunicación desacoplada entre módulos
 */
export class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
  }

  publish(eventName, payload) {
    this.emitter.emit(eventName, payload);
  }

  subscribe(eventName, handler) {
    this.emitter.on(eventName, handler);
  }
}

export const eventBus = new EventBus();
