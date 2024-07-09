import fs from 'fs';
import ds from 'datascript';
import { join } from 'path';
import { pageSchema, getDataPath } from './schema.js';

const INDEX_PATH = join(getDataPath(), '_index.json');
try {
  var json = fs.readFileSync(INDEX_PATH, 'utf8');
} catch (err) {}
export const INDEX = json
  ? ds.conn_from_db(ds.from_serializable(JSON.parse(json)))
  : ds.create_conn(pageSchema);

export function updateIndex(page) {
  let pages = ds.q(
    '[:find [?id ...] :in $ ?uuid :where [?id ":post/uuid" ?uuid]]',
    ds.db(INDEX),
    page[':post/uuid'],
  );

  let id = -1;
  if (pages.length !== 0) {
    id = pages[0];
  }

  ds.transact(INDEX, [
    {
      ...page,
      ':db/id': id,
    },
  ]);

  // // Serialize back to disk
  const json = JSON.stringify(ds.serializable(ds.db(INDEX)));
  fs.writeFileSync(INDEX_PATH, json, 'utf8');
}
