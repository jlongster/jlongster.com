import { q, find } from '../db/query.js';
import * as dateFns from 'date-fns';
import settings from '../settings';

export function parseDate(date) {
  return dateFns.parse(date, 'MMM do, yyyy', new Date());
}

function isLinked(names) {
  let nameSet = new Set(names);
  return props =>
    Object.values(props).find(prop => {
      return (
        Array.isArray(prop) &&
        prop.find(link => nameSet.has(link.toLowerCase()))
      );
    });
}

function withoutLinks(namesArr) {
  let names = new Set(namesArr.map(n => n.toLowerCase()));
  return props => {
    let found = Object.values(props).find(prop => {
      return (
        Array.isArray(prop) && prop.find(link => names.has(link.toLowerCase()))
      );
    });
    return !found;
  };
}

function getURL(props) {
  if (props.url == '' || props.url == null) {
    return null;
  }
  let url = new URL(props.url);
  let relativeUrl = url.pathname + url.search;
  return relativeUrl.replace(/^\//, '');
}

function mapBlocksToPages(blocks) {
  let pages = blocks
    .map(b => ({
      id: b.id,
      uuid: b[':block/uuid'],
      name: b[':block/original-name'],
      date: parseDate(b[':block/properties'].date),
      url: getURL(b[':block/properties'] || {}),
      properties: b[':block/properties'] || {}
    }))
    // They always must have a valid URL
    .filter(b => b.url);
  pages.sort((p1, p2) =>
    dateFns.compareDesc(
      parseDate(p1.properties.date),
      parseDate(p2.properties.date)
    )
  );
  return pages;
}

export function getPages({
  limit = Infinity,
  offset = 0,
  tags,
  excludeTags
} = {}) {
  let blocks = q(
    find('[(pull ?b [*]) ...]')
      .where([
        '?b :block/properties ?props',
        '(has-date ?props)',
        '?b :block/original-name',
        '(has-link ?props)',
        '(without-link ?props)'
      ])
      .in('$ has-date has-link without-link'),
    props => {
      return !!(props.date && Array.isArray(props.date));
    },
    tags ? isLinked(tags) : props => true,
    excludeTags ? withoutLinks(excludeTags) : props => true
  );

  let pages = mapBlocksToPages(blocks);
  return pages.slice(offset, limit);
}

function groupBlocks(blocks) {
  let map = new Map();
  for (let block of blocks) {
    map.set(block.id, block);
  }
  return map;
}

function tree(node, map) {
  let sorted = [];
  let n =
    node.children &&
    node.children.find(
      c => node.id === (c[':block/left'] && c[':block/left'].id)
    );
  while (n) {
    sorted.push(n);
    n = map.get(n.next);
  }

  let children = sorted.map(c => tree(c, map));

  return {
    id: node.id,
    content: node[':block/content'] || '',
    name: node[':block/original-name'],
    children,
    url: getURL(node[':block/properties'] || {}),
    properties: node[':block/properties'] || {}
  };
}

export function getPageByName(name) {
  let blocks = q(
    find('[(pull ?id [*]) ...]')
      .where([
        '?p :block/original-name ?name',
        '?id',
        '(or [(= ?p ?id)] [?id :block/page ?p])'
      ])
      .in('$ ?name'),
    name
  );

  return _getPage(blocks);
}

export function getPage(url) {
  let blocks = q(
    find('[(pull ?id [*]) ...]')
      .where([
        '?p :block/original-name',
        '?p :block/properties ?props',
        '(get-prop ?props "url") ?u',
        '(= ?u ?url)',
        '?id',
        '(or [(= ?p ?id)] [?id :block/page ?p])'
      ])
      .in('$ ?url get-prop'),
    `${settings.site}/${url}`,
    (map, name) => map[name]
  );

  return _getPage(blocks);
}

export function _getPage(blocks) {
  let grouped = groupBlocks(blocks);

  for (let block of blocks) {
    if (block[':block/left']) {
      let left = grouped.get(block[':block/left'].id);

      if (
        left[':block/parent'] &&
        block[':block/parent'].id === left[':block/parent'].id
      ) {
        grouped.get(block[':block/left'].id).next = block.id;
      }
    }
  }

  for (let block of blocks) {
    if (block[':block/parent']) {
      let parent = grouped.get(block[':block/parent'].id);
      parent.children = parent.children || [];
      parent.children.push(block);
    }
  }

  let pageBlock = blocks.find(b => b[':block/original-name']);
  let blockTree = pageBlock ? tree(pageBlock, grouped) : null;

  return { page: blockTree, refs: [] };
}

export function getLinkedPages(rawName) {
  let name = rawName.toLowerCase();

  let blocks = q(
    find('[(pull ?p [*]) ...]')
      .where([
        '?p :block/original-name',
        '?p :block/properties ?props',
        '(has-link ?props)'
      ])
      .in('$ has-link'),
    isLinked([name])
  );

  return mapBlocksToPages(blocks);
}
