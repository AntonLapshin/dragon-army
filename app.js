import { setStatusBarVisible } from '@zos/ui';

App({
  globalData: {},

  onCreate() {
    setStatusBarVisible(false);
  },

  onDestroy() {
  },
});
