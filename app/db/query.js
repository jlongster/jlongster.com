import fs from 'fs';
import * as url from 'url';
import { join } from 'path';
import ds from 'datascript';

export let dataPath;

if (process.env.NODE_ENV === 'development') {
  if (typeof __dirname === 'undefined') {
    dataPath = join(
      url.fileURLToPath(new URL('.', import.meta.url)),
      '/../../data'
    );
  } else {
    dataPath = join(__dirname, '/../data');
  }
} else {
  dataPath = '/data';
}

let conn;

create();

export function create() {
  let schema = JSON.parse(
    fs.readFileSync(join(dataPath, '/schema.json'), 'utf8')
  );

  let parsed = JSON.parse(
    fs.readFileSync(join(dataPath, '/datoms.json'), 'utf8')
  );

  conn = ds.conn_from_datoms(parsed, schema);
}

function quoteKeywords(str) {
  return str.replace(/(:[\w-/]+)/g, '"$1"');
}

export function q(query, ...input) {
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
    where
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
