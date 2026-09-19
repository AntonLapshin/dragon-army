let manualSteps = 0;

export const stepsAdapter = {
  getSteps() {
    return manualSteps;
  },

  add(steps) {
    manualSteps += steps;
  },

  set(steps) {
    manualSteps = steps;
  },

  reset() {
    manualSteps = 0;
  },
};

export const sensorAdapter = stepsAdapter;
