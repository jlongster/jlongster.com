import fs from 'fs';
import ds from 'datascript';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import LRUCache from 'lru-cache';
import { schema } from './schema';
import { getDataPath } from './data-path';
import * as indexer from './indexer';

// The atom feed renders 50 posts, and that URL is consistently hit.
// Se this to 1 more to cover all the latest 50 posts and 1 other one
// so for the common cases the filesystem is never hit
const CONN_CACHE = new LRUCache({ max: 51 });

export function write(url, attrs, blocks) {
  let id = attrs.id;
  const conn = ds.create_conn(schema);

  const page = {
    ':db/id': -1,
    ':post/url': url,
    ':post/uuid': id,
    ':post/title': attrs.title || '',
    ':post/subtitle': attrs.subtitle || '',
    ':post/public': !!attrs.public,
    ':post/toc': !!attrs.toc,
    ':post/tags': attrs.tags || [],
    ':post/date': attrs.date || new Date(),
    ':post/featured-image': attrs['featured-image'] || '',
  };

  ds.transact(conn, [
    page,
    ...blocks.map((b, idx) =>
      filterNull({
        ':block/uuid': b.uuid || uuidv4(),
        ':block/post': -1,
        ':block/type': b.type,
        ':block/md': b.md,
        ':block/string': b.string,
        ':block/meta': b.meta || {},
        ':block/order': idx,
      }),
    ),
  ]);

  const filename = join(getDataPath(), id + '.json');
  const json = JSON.stringify(ds.serializable(ds.db(conn)));
  fs.writeFileSync(filename, json, 'utf8');

  indexer.update(page);
  CONN_CACHE.set(url, conn);
}

// TODO: currently we don't support removing a page yet
export function remove(url) {}

export function load(url) {
  // We cache based on url to avoid having to do a lookup in the index
  // every time. This should be fine; worst case some renamed urls
  // will leave around some old dbs that won't get used
  const cached = CONN_CACHE.get(url);
  if (cached) {
    console.log(`[cached] loading ${url}`);
    return cached;
  }

  const pages = ds.q(
    '[:find [?uuid ...] :in $ ?url :where [?id ":post/url" ?url] [?id ":post/uuid" ?uuid]]',
    ds.db(indexer.get()),
    url,
  );
  if (pages.length === 0) {
    return null;
  }
  const id = pages[0];

  const filename = join(getDataPath(), id + '.json');
  try {
    var json = fs.readFileSync(filename, 'utf8');
  } catch (err) {
    return null;
  }
  const conn = ds.conn_from_db(ds.from_serializable(JSON.parse(json)));
  CONN_CACHE.set(url, conn);
  return conn;
}

export function clearCache() {
  CONN_CACHE.reset();
}

function filterNull(obj) {
  return Object.fromEntries(Object.entries(obj).filter(v => v[1] != null));
}

export function stripNamespace(str) {
  if (str.indexOf('/') !== -1) {
    return str.split('/')[1];
  }
  return str;
}

export function stripNamespaces(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      return [stripNamespace(k), v];
    }),
  );
}

function quoteKeywords(str) {
  return str.replace(/(:[\w-/]+)/g, '"$1"');
}

export function q(conn, query, ...input) {
  let qstr = `[:find ${quoteKeywords(query.find)} `;
  if (query.inputs) {
    qstr += `:in ${query.inputs} `;
  }
  if (query.rules) {
    qstr +=
      ':where ' +
      query.rules
        .map(r => {
          if (r.startsWith('(not') || r.startsWith('(or')) {
            return r;
          }
          return `[${r}]`;
        })
        .join(' ');
  }
  qstr += ']';

  return ds.q(qstr, ds.db(conn), ...input);
}

export function find(str) {
  return {
    find: str,
    inputs: null,
    rules: null,
    in: _in,
    where,
  };
}

function _in(inputs) {
  this.inputs = inputs;
  return this;
}

function where(rules) {
  this.rules = rules.map(rule => quoteKeywords(rule));
  return this;
}
