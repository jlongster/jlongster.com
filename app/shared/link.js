import settings from '../settings.mjs';

export function link(url, { absolute = false } = {}) {
  let base = settings.base || '';
  let site = settings.site || '';

  if (url[0] !== '/') {
    throw new Error('urls to `link` must start with a slash');
  }
  if (base[base.length - 1] === '/') {
    throw new Error('`base` in settings must not end in a trailing slash');
  }
  if (site[site.length - 1] === '/') {
    throw new Error('`site` in settings must not end in a trailing slash');
  }

  let root = '';
  if (absolute) {
    root = `https://${site}`;
  }

  return root + base + url;
}
