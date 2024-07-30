import { useLoaderData } from '@remix-run/react';
import ds from 'datascript';
import * as db from '../../../db';
import { getBlocks } from '../../../db/queries';
import { renderBlock } from '../../../md/render.js';
import { generateRunString } from '../../../../public/generate-run-string';

export function loader({ params }) {
  const { pageid } = params;

  const conn = db.load(pageid);
  if (conn == null) {
    throw new Response('Page not found', { status: 404 });
  }

  const blocks = getBlocks(conn);

  const str = blocks
    .map(block => {
      switch (block.meta.lang) {
        case 'css':
          return `
          <style type="text/css">
          ${block.string}
          </style>
          `;

        case 'html':
          return `<div>${block.string}</div>`;

        case 'javascript':
        case 'js':
          const str = generateRunString(block.uuid, block.string);
          return `
          <div id="${block.uuid}-placeholder" style="margin: 40px 0"></div>
            <script type="module">
            ${str}
            </script>
          `;
      }
    })
    .filter(Boolean)
    .join('\n\n\n');

  const doc = `
  <!DOCTYPE html>
  <body>
    ${str.trim()}
  </body>
  `;

  return new Response(doc.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
