// Looked at too much Clojure
export function first(arr) {
  return arr[0];
}

export function second(arr) {
  return arr[1];
}

export function third(arr) {
  return arr[2];
}

export function fourth(arr) {
  return arr[3];
}

// Group by field and return an object
export function groupBy(arr, field) {
  return arr.reduce((grouped, item) => {
    let key = item[field];
    grouped[key] = grouped[key] || [];
    grouped[key].push(item);
    return grouped;
  }, {});
}

// Group by field and return as an array of 2-element tuples. This
// is stable; it keeps the original sorting of both keys and values
export function groupByArray(arr, field) {
  let cache = new Map();
  return arr.reduce((grouped, item) => {
    let key = item[field];
    let group = cache.get(key);
    if (group == null) {
      group = [key, []];
      grouped.push(group);
      cache.set(key, group);
    }

    second(group).push(item);
    return grouped;
  }, []);
}

export function walkBlocks(node, func, nested = 0) {
  if (func(node, nested) === true) {
    return true;
  }

  for (let child of node.children) {
    if (walkBlocks(child, func, nested + 1) === true) {
      return true;
    }
  }
}

export function getEmbed(string) {
  let embed = string.match(/.*{{\[\[embed\]\]: ?(http.*)}}/);
  if (embed) {
    return embed[1];
  }
  return null;
}

export function getIframe(string) {
  let m = string.match(/{{iframe: (.*)}}/);
  if (m) {
    return m[1];
  }
  return null;
}
