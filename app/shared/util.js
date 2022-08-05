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
    offset ? `offset=${offset}` : null
  ]
    .filter(Boolean)
    .join('&');

  return qs !== '' ? `?${qs}` : '';
}
