import { renderBlock } from './md/render';

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

export function Blocks({ blocks }) {
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
            const code = `
              let __inspector = null;
              const render = value => {
                __inspector = document.createElement('inspect-code');
                __inspector.disabled = ${!!block.meta.show};
                __inspector.dataset['blockId'] = "${block.uuid}";

                let placeholder = document.getElementById('${id}-placeholder');

                const _insert = el => {
                  __inspector.appendChild(el);

                  // We lazily replace the placeholder until at least one
                  // piece of content is inserted to maintain a stable
                  // height, which avoids layout shift
                  if(placeholder) {
                    placeholder.replaceWith(__inspector)
                    placeholder = null;
                  }
                }

                'then' in value ? value.then(_insert) : _insert(value)
              }

              ${block.string}

              if(!__inspector) {
                document.getElementById('${id}-placeholder').remove()
              }
            `;

            live = (
              <>
                <div id={id + '-placeholder'} style={{ width, height }} />
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

      const html = renderBlock(block);
      const { Component, html: strippedHtml } = stripOuterComponent(html);

      return (
        <>
          {!block.meta.run || block.meta.show ? (
            <Component
              key={idx}
              dangerouslySetInnerHTML={{ __html: strippedHtml }}
            />
          ) : null}
          {live}
        </>
      );
    })
    .filter(Boolean);
}
