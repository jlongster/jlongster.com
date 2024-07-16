import { useLoaderData, useParams, useLocation } from '@remix-run/react';
import ds from 'datascript';
import * as db from '../../../db';
import { getBlocks } from '../../../db/queries';

function renderCodeBlock(block, pageid, isCurrent, location) {
  switch (block.meta.lang) {
    case 'css':
      return (
        <style
          key={block.uuid}
          type="text/css"
          dangerouslySetInnerHTML={{ __html: block.string }}
        />
      );

    case 'html':
      return isCurrent ? (
        <div
          key={block.uuid}
          dangerouslySetInnerHTML={{ __html: block.string }}
        />
      ) : null;

    case 'javascript':
    case 'js':
      return (
        <>
          <script
            key={block.uuid}
            // Passing along the search query allows cache busting
            src={`/code-look/script/${pageid}/${block.uuid}${location.search}`}
            type="module"
          />
          {isCurrent ? (
            <div
              className="inline-code-block"
              id={`${block.uuid}-placeholder`}
            />
          ) : null}
        </>
      );
  }

  throw new Error(
    'unable to render block language (${block.uuid}): ' + block.meta.lang,
  );
}

export function loader({ params }) {
  const { pageid, uuid } = params;

  const conn = db.load(pageid);
  if (conn == null) {
    throw new Response('Page not found', { status: 404 });
  }

  const blocks = getBlocks(conn);

  let codeBlocks = blocks.filter(
    b =>
      b.type === 'code' &&
      ['js', 'javascript', 'html', 'css'].includes(b.meta.lang) &&
      b.meta.run,
  );

  if (uuid) {
    const idx = codeBlocks.findIndex(b => b.uuid === uuid);
    codeBlocks = codeBlocks.slice(0, idx + 1);
  }

  return { codeBlocks };
}

export default function RunScript() {
  let location = useLocation();
  let { pageid, uuid } = useParams();
  let { codeBlocks } = useLoaderData();

  return (
    <>
      {uuid ? (
        <div style={{ fontStyle: 'italic', fontSize: '14px', margin: '1.5em' }}>
          Viewing output of a single code block. You can also{' '}
          <a href={`/code-look/html/${pageid}`}>show all outputs</a>
        </div>
      ) : null}
      {codeBlocks.map(block => {
        const isCurrent = !uuid || block.uuid === uuid;
        return renderCodeBlock(block, pageid, isCurrent, location);
      })}
      {/*<div
        style={{
          fontStyle: 'italic',
          fontSize: '14px',
          margin: '1.5em',
          color: 'gray',
        }}
      >
        reqid: {Math.random()}
      </div>*/}
      {uuid && <script type="module" src="/refresh.js" />}
    </>
  );
}
