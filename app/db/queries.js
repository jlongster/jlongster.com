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

function _getPages(query, inputs) {
  const pages = inputs
    ? db.q(indexer.get(), query, inputs)
    : db.q(indexer.get(), query);

  return sortedByDate(pages.map(db.stripNamespaces)).filter(p => p.public);
}

export function getPages() {
  return _getPages(db.find('[(pull ?id [*]) ...]').where(['?id :post/uuid']));
}

export function getPagesWithTag(tag) {
  return _getPages(
    db
      .find('[(pull ?id [*]) ...]')
      .where(['?id :post/uuid', '?id :post/tags ?tags', '(includes-tag ?tags)'])
      .in('$ includes-tag'),
    tags => tags.includes(tag),
  );
}
