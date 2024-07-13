import ds from 'datascript';
import * as db from '../../../db';
import { renderBlock } from '../../../md/render.js';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';

hljs.registerLanguage('javascript', javascript);

export async function loader({ params }) {
  const { pageid, uuid } = params;

  const conn = db.load(pageid);
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

  let codeBlocks = [
    {
      uuid,
      title: block.meta?.title,
      code: renderBlock(block),
      primary: true,
    },
  ];

  return new Response(JSON.stringify(codeBlocks, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'text/json',
    },
  });
}
