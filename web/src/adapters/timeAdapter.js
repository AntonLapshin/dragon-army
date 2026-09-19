let debugOffset = 0;

export const timeAdapter = {
  getTime() {
    return Date.now() + debugOffset;
  },

  addHours(hours) {
    debugOffset += hours * 60 * 60 * 1000;
  },

  addDays(days) {
    debugOffset += days * 24 * 60 * 60 * 1000;
  },

  resetOffset() {
    debugOffset = 0;
  },
};
