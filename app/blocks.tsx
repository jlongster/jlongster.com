import { EmbeddedTweet } from './tweets/embedded-tweet';
import { renderBlock } from './md/render';

export function slug(str) {
  return str
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '')
    .toLowerCase();
}

function stripOuterComponent(html) {
  const m = html.match(/^\s*<([^>]*)>/);
  if (m == null) {
    throw new Error('Invalid html passed to `stripOuterComponent`:' + html);
  }

  const Component = m[1];
  return {
    Component,
    html: html.replace(/^\s*<([^>]*)>/, '').replace(/<\/([^>]*)>\s*$/, ''),
  };
}

export function TableOfContents({ pageid, toc }) {
  return (
    <div className="toc" id="toc">
      {toc.map(h => {
        const id = slug(h.string);
        return (
          <div
            key={id}
            style={{ marginLeft: (h.meta.depth - 2) * 10, marginBottom: 5 }}
          >
            {/* TOC may be rendered while the content is filtered, so
                we must render a full link to ensure it navigates if
                necessary */}
            <a href={`/${pageid}#${id}`}>{h.string}</a>
          </div>
        );
      })}
    </div>
  );
}

export function Blocks({ blocks, pageid, sectionName }) {
  let currentSectionName;

  return blocks
    .map((block, idx) => {
      if (block.type === 'heading' && block.meta.depth === 2) {
        currentSectionName = slug(block.string);
      }

      let live = null;
      let shouldShowBlock =
        sectionName == null || currentSectionName === sectionName;

      if (
        block.string.trim() === '' ||
        (block.type === 'code' && block.meta.lang === 'comment')
      ) {
        return null;
      }

      if (block.type === 'code' && block.meta.run) {
        let shouldRenderCode = block.meta.show && shouldShowBlock;

        switch (block.meta.lang) {
          case 'css':
            live = (
              <style
                type="text/css"
                dangerouslySetInnerHTML={{ __html: block.string }}
              />
            );
            break;
          case 'js':
          case 'javascript': {
            const width = block.meta.width;
            const height = block.meta.height;
            const id = '' + Math.random();

            function wrapCode(code) {
              return `
                const result = (() => {${code}})();
                if(result) {
                  render(result)
                }
              `;
            }

            // Note: some of this rendering logic needs to be in sync
            // with the "/code-look/script" that url that renders live
            // examples
            const code = `
              let __inspector = document.createElement('inspect-code');
              __inspector.disabled = ${!!shouldRenderCode};
              __inspector.dataset['blockId'] = "${block.uuid}";

              let __placeholder = document.getElementById('${id}-placeholder');
              let __renderCalled = false;

              const render = value => {
                if(!${shouldShowBlock}) {
                  return;
                }

                __renderCalled = true;

                const _insert = el => {
                  __inspector.appendChild(el);

                  // We lazily replace the placeholder until at least one
                  // piece of content is inserted to maintain a stable
                  // height, which avoids layout shift
                  if(__placeholder) {
                    __placeholder.replaceWith(__inspector)
                    __placeholder = null;
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

              ${
                block.string.startsWith('import')
                  ? block.string
                  : wrapCode(block.string)
              }

              if(!__renderCalled) {
                if(${!!shouldRenderCode}) {
                  document.getElementById('${id}-placeholder').textContent = '(no output)'
                }
                else {
                  document.getElementById('${id}-placeholder').remove()
                }
              }
            `;

            live = (
              <>
                <div
                  id={id + '-placeholder'}
                  className="placeholder"
                  style={{ width, height }}
                />
                <script
                  type={block.meta.unscoped ? '' : 'module'}
                  id={id}
                  dangerouslySetInnerHTML={{ __html: code }}
                />
              </>
            );
            break;
          }

          case 'html': {
            live = (
              <inspect-code
                disabled={!!shouldRenderCode}
                data-block-id={block.uuid}
                dangerouslySetInnerHTML={{ __html: block.string }}
              />
            );
            break;
          }
        }

        const anchor = <a id={`block-${block.uuid}`} />;

        if (shouldRenderCode) {
          const html = renderBlock(block);
          const { Component, html: strippedHtml } = stripOuterComponent(html);

          return (
            <>
              {anchor}
              <div key={idx} className="runnable-code">
                <div className="runnable-code-source">
                  <Component
                    key={idx}
                    dangerouslySetInnerHTML={{
                      __html: strippedHtml,
                    }}
                  />
                </div>

                {live}

                <a
                  href={`/code-look/html/${pageid}/${block.uuid}`}
                  target="_blank"
                  className="edit"
                >
                  <span>edit</span>
                </a>
              </div>
            </>
          );
        } else {
          return (
            <>
              {anchor}
              {live}
            </>
          );
        }
      }

      if (!shouldShowBlock) {
        return null;
      }

      if (block.type === 'code' && block.meta.tweet) {
        return (
          <EmbeddedTweet
            tweet={JSON.parse(block.string)}
            connect={block.meta.connect}
          />
        );
      }

      const html = renderBlock(block);
      const { Component, html: strippedHtml } = stripOuterComponent(html);

      if (block.type === 'heading') {
        const id = slug(block.string);
        return (
          <Component key={idx} id={id}>
            <a
              href={'#' + id}
              dangerouslySetInnerHTML={{ __html: strippedHtml }}
            />
          </Component>
        );
      }

      return (
        <Component
          key={idx}
          dangerouslySetInnerHTML={{
            __html: strippedHtml,
          }}
        />
      );
    })
    .filter(Boolean);
}
