import * as db from './db';
import * as indexer from './indexer';

function sortedByDate(arr) {
  return [...arr].sort(
    (item1, item2) => item1.date.getTime() - item2.date.getTime(),
  );
}

export function getPage(conn) {
  const [page] = db.q(
    conn,
    db.find('[(pull ?id [*]) ...]').where(['?id :post/title']),
  );
  return db.stripNamespaces(page);
}

export function getBlocks(conn) {
  const blocks = db.q(
    conn,
    db.find('[(pull ?id [*]) ...]').where(['?id :block/uuid']),
  );
  blocks.sort((n1, n2) => n1[':block/order'] - n2[':block/order']);
  return blocks.map(db.stripNamespaces);
}

export function getPages() {
  const pages = db.q(
    indexer.get(),
    db.find('[(pull ?id [*]) ...]').where(['?id :post/uuid']),
  );
  return sortedByDate(pages.map(db.stripNamespaces));
}

export function getPagesWithTag(tag) {
  const pages = db.q(
    indexer.get(),
    db
      .find('[(pull ?id [*]) ...]')
      .where(['?id :post/uuid', '?id :post/tags ?tags', '(includes-tag ?tags)'])
      .in('$ includes-tag'),
    tags => tags.includes(tag),
  );
  return sortedByDate(pages.map(db.stripNamespaces));
}
