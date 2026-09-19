import { statSync, writeFileSync, readFileSync } from '@zos/fs';

const FILE_NAME = 'dragon_army_data.txt';

export const storageAdapter = {
  load() {
    try {
      const fStat = statSync({ path: FILE_NAME });
      if (!fStat) return null;

      const raw = readFileSync({
        path: FILE_NAME,
        options: { encoding: 'utf8' },
      });
      if (!raw) return null;

      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  },

  save(state) {
    try {
      writeFileSync({
        path: FILE_NAME,
        data: JSON.stringify(state),
        options: { encoding: 'utf8' },
      });
    } catch (_) {}
  },
};
