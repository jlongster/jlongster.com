import * as db from '../../db/website';
import { renderBlock } from '~/md';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';

hljs.registerLanguage('javascript', javascript);

function getCode(block) {
  renderBlock(block);
  return hljs.highlight(block.string.trim(), {
    language: 'javascript',
  }).value;
}

export async function loader({ params }) {
  let uuid = params['uuid'];
  let block = db.getBlock(uuid);

  let codeBlocks = [
    {
      uuid,
      title: block.properties.title,
      code: getCode(block),
      primary: true,
    },
  ];

  if ('depends' in block.properties) {
    const uuids = block.properties.depends.split(',').map(id => id.trim());
    codeBlocks = codeBlocks.concat(
      uuids.map(uuid => {
        let block = db.getBlock(uuid);

        return {
          uuid,
          title: block.properties.title,
          code: getCode(block),
        };
      }),
    );
  }

  return new Response(JSON.stringify(codeBlocks, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'text/json',
    },
  });
}
