import * as db from './db';
import { INDEX } from './indexer';

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
    INDEX,
    db.find('[(pull ?id [*]) ...]').where(['?id :post/uid']),
  );
  console.log(pages)
  return pages.map(db.stripNamespaces);
}

export function getPagesWithTag(tag) {
  const pages = db.q(
    INDEX,
    db.find('[(pull ?id [*]) ...]').where(['?id :post/uid']),
  );
  return pages.map(db.stripNamespaces);
}
