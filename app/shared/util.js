import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function rootPath() {
  return process.env === 'development'
    ? join(__dirname, '../..')
    : join(__dirname, '../..');
}

export function getFilter(str) {
  str = (str || '').trim();
  return str === 'everything' || str === '' ? null : str;
}

export function makeQueryString(opts) {
  let filter = opts.filter;
  let hideDaily = opts.hideDaily;
  let offset = opts.offset;

  let qs = [
    filter ? `filter=${filter}` : null,
    hideDaily ? 'daily=false' : null,
    offset ? `offset=${offset}` : null,
  ]
    .filter(Boolean)
    .join('&');

  return qs !== '' ? `?${qs}` : '';
}
