import ds from 'datascript';
import * as db from '../../db/new/db.server';
import { renderBlock } from '../../md/new/render.js';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';

hljs.registerLanguage('javascript', javascript);

export async function loader({ params }) {
  const { pageid, uuid } = params;

  const conn = db.load(pageid);
  const blocks = ds.q(
    '[:find [(pull ?id [*]) ...] :in $ ?uuid :where [?id ":block/uuid" ?uuid]]',
    ds.db(conn),
    uuid,
  );

  if (blocks.length === 0) {
    return new Response('', { status: 404 });
  }

  const block = db.stripNamespaces(blocks[0]);

  // TODO: titles for the dialog aren't working
  let codeBlocks = [
    {
      uuid,
      title: block.meta?.title,
      code: renderBlock(block),
      primary: true,
    },
  ];

  // if ('depends' in block.properties) {
  //   // TODO: Need to also fetch all deps of deps (transitively)
  //   const uuids = block.properties.depends.split(',').map(id => id.trim());
  //   codeBlocks = uuids
  //     .map(uuid => {
  //       let block = db.getBlock(uuid);

  //       return {
  //         uuid,
  //         title: block.properties.title,
  //         code: getCode(block),
  //       };
  //     })
  //     .concat(codeBlocks);
  // }

  return new Response(JSON.stringify(codeBlocks, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'text/json',
    },
  });
}
