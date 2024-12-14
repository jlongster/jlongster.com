import { useLoaderData, useParams, useLocation } from '@remix-run/react';
import * as db from '../../../db';
import { renderBlock } from '../../../md/render';
import { getPage, getBlocks } from '../../../db/queries';
import { generateRunString } from '../../../../public/generate-run-string';

function renderCodeBlock(block, pageid, focusedId, location) {
  let live = null;

  if (block.type === 'heading') {
    return <span dangerouslySetInnerHTML={{ __html: renderBlock(block) }} />;
  }

  switch (block.meta.lang) {
    case 'css':
      live = (
        <style
          key={block.uuid}
          type="text/css"
          dangerouslySetInnerHTML={{ __html: block.string }}
        />
      );
      break;

    case 'html':
      live =
        !focusedId || focusedId === block.uuid ? (
          <div
            key={block.uuid}
            dangerouslySetInnerHTML={{ __html: block.string }}
          />
        ) : null;
      break;

    case 'javascript':
    case 'js': {
      const code = generateRunString(block.uuid, block.string);

      live = (
        <script
          key={block.uuid}
          type="module"
          dangerouslySetInnerHTML={{ __html: code }}
        />
      );
    }
  }

  if (focusedId && focusedId !== block.uuid) {
    return live;
  }

  const readonly = !(
    block.meta.lang === 'js' || block.meta.lang === 'javascript'
  );
  const code = `
    (window.__editorSources || (window.__editorSources = [], window.__editorSources)).push({
      id: "${block.uuid}",
      source: ${JSON.stringify(block.string)},
      readonly: ${readonly}
    })
  `;

  return (
    <div
      key={block.uuid}
      className={'runnable-code' + (focusedId ? ' focused' : '')}
    >
      <div className="editor" id={`editor-${block.uuid}`}>
        <div className="editor-instance" />
        {!readonly && (
          <div className="editor-actions">
            <button className="btn-run">run</button>
            {!focusedId && <button className="btn-focus">focus</button>}
          </div>
        )}
      </div>

      <div className="runnable-code-output">
        <div
          className="runnable-code-output-content"
          id={`${block.uuid}-placeholder`}
        >
          {block.meta.lang === 'html' ? live : null}
        </div>
        {block.meta.lang !== 'html' ? live : null}
      </div>

      <script type="module" dangerouslySetInnerHTML={{ __html: code }} />
    </div>
  );
}

export function loader({ params }) {
  const { pageid, uuid } = params;

  const conn = db.load(pageid);
  if (conn == null) {
    throw new Response('Page not found', { status: 404 });
  }

  const page = getPage(conn);
  const blocks = getBlocks(conn);

  let codeBlocks = blocks.filter(
    b =>
      (!uuid && b.type === 'heading') ||
      (b.type === 'code' &&
        ['js', 'javascript', 'html', 'css'].includes(b.meta.lang) &&
        b.meta.run),
  );

  if (uuid) {
    const idx = codeBlocks.findIndex(b => b.uuid === uuid);
    codeBlocks = codeBlocks.slice(0, idx + 1);
  }

  return { page, codeBlocks };
}

export default function CodeBlocksExecute() {
  let location = useLocation();
  let { pageid, uuid } = useParams();
  let { page, codeBlocks } = useLoaderData();

  return (
    <>
      {uuid ? (
        <div style={{ fontStyle: 'italic', fontSize: '14px', margin: '1.5em' }}>
          Viewing output of a single code block from{' '}
          <a href={`/${pageid}`}>{page.title}</a>. Press cmd+enter to evaluate
          code.
          <div>
            <a href={`/code-look/html/${pageid}`}>Show all code blocks</a> -{' '}
            <a href={`/${pageid}#block-${uuid}`}>View in post</a>
          </div>
        </div>
      ) : (
        <div style={{ fontStyle: 'italic', fontSize: '14px', margin: '1.5em' }}>
          Viewing all examples from <a href={`/${pageid}`}>{page.title}</a>.
          <div>
            <a href={`/code-look/downloadable/${pageid}.html`} download>
              Download scripts as HTML file
            </a>
          </div>
        </div>
      )}

      <div className="code-blocks">
        {codeBlocks.map(block => {
          return renderCodeBlock(block, pageid, uuid, location);
        })}
      </div>

      <script type="module" src="/refresh.js" />

      {/* We build this in the `codemirror-bundle` repo and copied it over */}
      <script type="module" src="/codemirror.bundle.js" />

      {/* Allow reevalution of scripts.
       *
       * NOTE: This is a simple approach that doesn't guarantee the
       * same execution semantics as modules inlined into the raw HTML
       * page. One example is how async module are treated: if a module
       * contains an `import` statement from a remote source, that will
       * cause the script to block until the import loads. In the
       * normal page environment, that blocks the rest of the inline
       * module scripts. However here it does not, so later scripts
       * will execute *before* the async script executes
       */}
      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: `
          import {generateRunString} from "/generate-run-string.js";

          const evalSources = new Map();

          if(window.__editorSources) {
            function reevaluate() {
              window.__editorSources.forEach(data => {
                if(!data.readonly) {
                  const script = document.createElement('script');
                  script.type = 'module';
                  script.textContent = evalSources.get(data.id);
                  document.body.appendChild(script);
                }
              })
            }

            window.__editorSources.forEach(data => {
              const el = document.getElementById("editor-" + data.id);

              const onChange = src => {
                evalSources.set(data.id, generateRunString(data.id, src));
                reevaluate();
              }

              el.querySelector('.btn-run')?.addEventListener('click', () => {
                onChange(cm.state.doc.toString());
              })

              el.querySelector('.btn-focus')?.addEventListener('click', () => {
                window.location.href = window.location.pathname + '/' + data.id;
              })

              const cm = window.__createCodeMirror(data.source, el.querySelector('.editor-instance'), onChange, data.readonly);
              evalSources.set(data.id, generateRunString(data.id, data.source));
            })
          }
          `,
        }}
      />
    </>
  );
}
