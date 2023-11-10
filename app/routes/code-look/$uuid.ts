import * as db from '../../db/website';
import { renderBlock } from '~/md';

function getCode(uuid) {
  let block = db.getBlock(uuid);
  renderBlock(block);
  return block.string.trim();
}

export async function loader({ params }) {
  let uuid = params['uuid'];
  let block = db.getBlock(uuid);
  renderBlock(block);

  let codeBlocks = [block.string.trim()];

  if ('depends' in block.properties) {
    const uuids = block.properties.depends.split(',').map(id => id.trim());

    codeBlocks = [...uuids.map(uuid => getCode(uuid)), codeBlocks];
  }

  return new Response(JSON.stringify(codeBlocks, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'text/json',
    },
  });
}
