import { join } from 'path';
import * as url from 'url';

export const pageSchema = {
  ':post/uid': {},
  ':post/title': {},
  ':post/public': {},
  ':post/url': {},
  ':post/tags': { ':db/cardinality': ':db.cardinality/many' },
  ':post/date': {},
  ':post/featured-img': {},
};

export const schema = {
  ...pageSchema,
  ':block/uuid': {},
  ':block/post': {
    ':db/valueType': ':db.type/ref',
    ':db/cardinality': ':db.cardinality/one',
  },
  ':block/type': {},
  ':block/order': {},
  ':block/md': {},
  ':block/string': {},
  ':block/meta': {},
};

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
