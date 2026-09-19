import { Step } from '@zos/sensor';

let _step = null;

function getSensor() {
  if (!_step) {
    try {
      _step = new Step();
    } catch (e) {
      _step = { getCurrent() { return 0; } };
    }
  }
  return _step;
}

export const sensorAdapter = {
  getSteps() {
    try {
      return getSensor().getCurrent() || 0;
    } catch (e) {
      return 0;
    }
  },
};
