import { useLoaderData } from '@remix-run/react';
import ds from 'datascript';
import * as db from '../../../db';
import { getBlocks } from '../../../db/queries';
import { renderBlock } from '../../../md/render.js';

function wrapCode(code) {
  return `
  const result = (() => {

  
/*************** user code *********************/
  
${code}

/*************** end user code *********************/


})();

if(result) {
  render(result)
}`;
}

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

  const str = `
let __renderCalled = false;
let __placeholder = document.getElementById('${block.uuid}-placeholder');
  
const render = value => {
  __renderCalled = true;
const _insert = el => {
    if(__placeholder) {
      __placeholder.appendChild(el);
    }
  }
  
  if(typeof value === 'number') {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = value;
    pre.appendChild(code);
    _insert(pre);
  }
  else {
    'then' in value ? value.then(_insert) : _insert(value)
  }
}

${block.string.startsWith('import') ? block.string : wrapCode(block.string)}

if(!__renderCalled && __placeholder) {
  __placeholder.textContent = '(no output)'
}
  `;

  return new Response(str.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/javascript',
    },
  });
}
