import '@testing-library/jest-dom';

global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

class MockPointerEvent extends Event {
  pointerId = 1;
  pointerType = 'mouse';
  isPrimary = true;
  width = 0;
  height = 0;
  pressure = 0;
  tangentialPressure = 0;
  tiltX = 0;
  tiltY = 0;
  twist = 0;
  clientX = 0;
  clientY = 0;
  pageX = 0;
  pageY = 0;
  screenX = 0;
  screenY = 0;

  constructor(type: string, init?: any) {
    super(type, init);
    Object.assign(this, init);
  }

  getCoalescedEvents() {
    return [this];
  }

  getPredictedEvents() {
    return [];
  }
}

if (typeof global.PointerEvent === 'undefined') {
  global.PointerEvent = MockPointerEvent as any;
}

// Mock HTMLElement pointer capture methods
if (HTMLElement.prototype.setPointerCapture === undefined) {
  HTMLElement.prototype.setPointerCapture = function() {};
}

if (HTMLElement.prototype.releasePointerCapture === undefined) {
  HTMLElement.prototype.releasePointerCapture = function() {};
}

if (HTMLElement.prototype.hasPointerCapture === undefined) {
  HTMLElement.prototype.hasPointerCapture = function() {
    return false;
  };
}

