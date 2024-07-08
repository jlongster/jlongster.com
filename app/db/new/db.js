import fs from 'fs';
import ds from 'datascript';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { schema, getDataPath } from './schema';
import { updateIndex } from './indexer';

export function write(id, title, attrs, blocks) {
  const conn = ds.create_conn(schema);

  console.log(attrs);

  const page = {
    ':db/id': -1,
    ':post/uid': id,
    ':post/title': title || '',
    ':post/subtitle': attrs.subtitle || '',
    ':post/public': !!attrs.public,
    ':post/url': attrs.url || '',
    ':post/tags': attrs.tags || [],
    ':post/date': attrs.date || new Date(),
    ':post/featured-image': attrs['featured-image'] || '',
  };

  ds.transact(conn, [
    page,
    ...blocks.map((b, idx) =>
      filterNull({
        ':block/uuid': uuidv4(),
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

  updateIndex(page);
}

export function load(name) {
  const filename = join(getDataPath(), name + '.json');
  try {
    var json = fs.readFileSync(filename, 'utf8');
  } catch (err) {
    return null;
  }
  return ds.conn_from_db(ds.from_serializable(JSON.parse(json)));
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
