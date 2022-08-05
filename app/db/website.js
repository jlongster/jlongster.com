import { q, find } from '../db/query.js';
import * as dateFns from 'date-fns';

export function parseDate(date) {
  return dateFns.parse(date, 'MMM do, yyyy', new Date());
}

function mapBlocksToPages(blocks) {
  let pages = blocks.map(b => ({
    id: b.id,
    uuid: b[':block/uuid'],
    name: b[':block/original-name'],
    properties: b[':block/properties']
  }));
  pages.sort((p1, p2) =>
    dateFns.compareDesc(
      parseDate(p1.properties.date),
      parseDate(p2.properties.date)
    )
  );
  return pages;
}

export function getPages({ limit = Infinity, offset = 0 } = {}) {
  let blocks = q(
    find('[(pull ?b [*]) ...]')
      .where([
        '?b :block/properties ?props',
        '(has-date ?props)',
        '?b :block/original-name'
      ])
      .in('$ has-date'),
    props => {
      return !!(props.date && Array.isArray(props.date));
    }
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
    properties: node[':block/properties']
  };
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
    url,
    (map, name) => map[name]
  );

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

  //console.log(blockTree.children[3].children)

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
    props => {
      return Object.values(props).find(prop => {
        return (
          Array.isArray(prop) && prop.find(link => link.toLowerCase() === name)
        );
      });
    }
  );

  return mapBlocksToPages(blocks);
}
