import { useLoaderData } from '@remix-run/react';
import ds from 'datascript';
import * as db from '../../../db';
import { getBlocks } from '../../../db/queries';
import { renderBlock } from '../../../md/render.js';
import { generateRunString } from '../../../../public/generate-run-string';

export function loader({ params }) {
  const { pageid, uuid } = params;

  const conn = db.load(pageid);
  if (conn == null) {
    throw new Response('Page not found', { status: 404 });
  }

  const blocks =
    conn &&
    ds.q(
      '[:find [(pull ?id [*]) ...] :in $ ?uuid :where [?id ":block/uuid" ?uuid]]',
      ds.db(conn),
      uuid,
    );

  if (!blocks || blocks.length === 0) {
    return new Response('', { status: 404 });
  }

  const block = db.stripNamespaces(blocks[0]);
  const str = generateRunString(block.uuid, block.string);

  return new Response(str.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/javascript',
    },
  });
}
