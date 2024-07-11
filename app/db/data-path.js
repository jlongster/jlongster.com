import * as fs from 'fs';
import { join } from 'path';

let localDataPath =
  process.env.NODE_ENV === 'development'
    ? join(__dirname, '/../data')
    : '/data';

let siteDataPath = join(localDataPath, 'site');

if (!fs.existsSync(siteDataPath)) {
  fs.mkdirSync(siteDataPath);
}

export function getDataPath() {
  return siteDataPath;
}
