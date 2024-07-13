import { renderBlock } from './md/render';

export function slug(str) {
  return str
    .replace(/[^a-zA-Z]+/g, '-')
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

function TableOfContents({ toc }) {
  return (
    <div className="toc" id="toc">
      {toc.map(h => {
        const id = slug(h.string);
        return (
          <div
            key={id}
            style={{ marginLeft: (h.meta.depth - 2) * 10, marginBottom: 5 }}
          >
            <a href={`#${id}`}>{h.string}</a>
          </div>
        );
      })}
    </div>
  );
}

export function Blocks({ blocks, toc }) {
  return blocks
    .map((block, idx) => {
      let live = null;

      if (
        block.string.trim() === '' ||
        (block.type === 'code' && block.meta.lang === 'comment')
      ) {
        return null;
      }

      if (block.type === 'code' && block.meta.run) {
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
              __inspector.disabled = ${!!block.meta.show};
              __inspector.dataset['blockId'] = "${block.uuid}";

              let __placeholder = document.getElementById('${id}-placeholder');
              let __renderCalled = false;

              const render = value => {
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
                if(${!!block.meta.show}) {
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
                disabled={!!block.meta.show}
                data-block-id={block.uuid}
                dangerouslySetInnerHTML={{ __html: block.string }}
              />
            );
            break;
          }
        }
      }

      if (block.type === 'paragraph' && block.string === '^TOC') {
        return <TableOfContents toc={toc} />;
      }

      const html = renderBlock(block);
      const { Component, html: strippedHtml } = stripOuterComponent(html);

      let props = {};
      if (block.type === 'heading') {
        props = { id: slug(block.string) };
      }

      const source = (
        <Component
          key={idx}
          dangerouslySetInnerHTML={{ __html: strippedHtml }}
          {...props}
        />
      );

      if (live) {
        if (block.meta.show) {
          return (
            <div key={idx} className="runnable-code">
              {source}
              {live}
            </div>
          );
        } else {
          return live;
        }
      }

      return source;
    })
    .filter(Boolean);
}
