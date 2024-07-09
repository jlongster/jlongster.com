import * as fs from 'fs';
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

let siteDataPath = join(localDataPath, 'site');

if (!fs.existsSync(siteDataPath)) {
  fs.mkdirSync(siteDataPath);
}

export function getDataPath() {
  return siteDataPath;
}
