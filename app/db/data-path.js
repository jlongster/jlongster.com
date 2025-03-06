import * as fs from 'fs';
import { join } from 'path';
import { rootPath } from '../shared/util';

let localDataPath =
  process.env.NODE_ENV === 'development' ? join(rootPath(), 'data') : '/data';

let siteDataPath = join(localDataPath, 'site');

if (!fs.existsSync(siteDataPath)) {
  fs.mkdirSync(siteDataPath);
}

export function getDataPath() {
  return siteDataPath;
}
