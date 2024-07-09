import fs from 'fs';
import ds from 'datascript';
import { join } from 'path';
import { pageSchema } from './schema.js';
import { getDataPath } from './data-path';

const INDEX_PATH = join(getDataPath(), '_index.json');
let INDEX = null;

export function get() {
  return INDEX;
}

export function load() {
  try {
    var json = fs.readFileSync(INDEX_PATH, 'utf8');
  } catch (err) {}

  INDEX = json
    ? ds.conn_from_db(ds.from_serializable(JSON.parse(json)))
    : ds.create_conn(pageSchema);
}

export function update(page) {
  if (INDEX == null) {
    throw new Error('`indexer.update` called before index has been loaded');
  }

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

// Load the initial index
load();
