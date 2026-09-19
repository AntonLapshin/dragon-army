import hmUI from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../utils/constants.js';
import { storageAdapter } from '../utils/storageAdapter.js';
import { sensorAdapter } from '../utils/sensorAdapter.js';
import { timeAdapter } from '../utils/timeAdapter.js';

let _widgets = [];
let _page = null;

Page({
  build() {
    _page = this;
    this.render();
  },

  onResume() {
    this.render();
  },

  onPause() {},
  onDestroy() {},

  render() {
    const width = DEVICE_WIDTH;
    const height = DEVICE_HEIGHT;

    _widgets.forEach((w) => hmUI.deleteWidget(w));
    _widgets = [];

    _widgets.push(
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 0,
        y: 120,
        w: width,
        h: 60,
        text: 'Dragon Army',
        text_size: 32,
        color: 0xffffff,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
      }),
    );

    _widgets.push(
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 0,
        y: 190,
        w: width,
        h: 40,
        text: 'Empty boilerplate',
        text_size: 20,
        color: 0x888888,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
      }),
    );

    // Touch references so adapters stay wired through the web-runner plugin.
    void storageAdapter;
    void sensorAdapter;
    void timeAdapter;
  },
});
