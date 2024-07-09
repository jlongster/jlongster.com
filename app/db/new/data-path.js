import { join } from 'path';
import * as url from 'url';

let localDataPath;
if (typeof __dirname === 'undefined') {
  localDataPath = join(
    url.fileURLToPath(new URL('.', import.meta.url)),
    '/../../../data',
  );
} else {
  localDataPath = join(__dirname, '/../data');
}

export function getDataPath() {
  return localDataPath;
}
