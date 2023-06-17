function Value({ value }) {
  if (Array.isArray(value)) {
    return (
      <span>
        {value.map((v, i) => {
          let els = [<a href={`/links/${v}`}>{v}</a>];
          if (i !== value.length - 1) {
            els.push(', ');
          }
          return els;
        })}
      </span>
    );
  }

  return value;
}

function BlockContent({ block, root }) {
  if (block.properties.render === 'inline') {
    return null;
  } else if (block.properties.render === 'css') {
    return (
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: block.string }}
      />
    );
  } else if (block.properties.render === 'js-element') {
    const width = block.properties.width;
    const height = block.properties.height;
    const id = '' + Math.random();
    const code = `
      const placeholder = document.getElementById('${id}-placeholder');
      const tag = document.getElementById('${id}');
      const res = (() => {${block.string}})();
      const insert = el => {
        placeholder.replaceWith(el, tag)
      }
      'then' in res ? res.then(insert) : insert(res)
    `;
    return (
      <>
        <div id={id + '-placeholder'} style={{ width, height }} />
        <script
          type="module"
          id={id}
          dangerouslySetInnerHTML={{ __html: code }}
        />
      </>
    );
  } else if (block.properties.render === 'js-no-module') {
    return <script dangerouslySetInnerHTML={{ __html: block.string }} />;
  } else if (
    block.properties.render === 'js' ||
    block.properties.render === 'javascript'
  ) {
    return (
      <script
        type="module"
        dangerouslySetInnerHTML={{ __html: block.string }}
      />
    );
  } else if (block.properties.render === 'html') {
    return <div dangerouslySetInnerHTML={{ __html: block.string }} />;
  }

  let Component = root ? 'p' : 'span';

  return (
    <Component
      className={block.properties.footnote ? 'footnote' : ''}
      dangerouslySetInnerHTML={{ __html: block.string }}
    />
  );
}

function Block({ block }) {
  if (block.properties.render === 'skip') {
    return null;
  }

  return (
    <li>
      <BlockContent block={block} />
      {block.children.length > 0 && (
        <ul>
          {block.children.map(child => (
            <Block block={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

function SeriesContent({ series }) {
  return (
    <div className="series-content">
      {series.children.map(child => {
        if (child.properties.public) {
          // Don't render the page properties
          return null;
        }

        return (
          <>
            <BlockContent block={child} root={true} />
            {child.children.length > 0 && (
              <ul>
                {child.children.map(block => (
                  <Block block={block} key={block.id} />
                ))}
              </ul>
            )}
          </>
        );
      })}
    </div>
  );
}

export function Page({ page, series }) {
  let children = page.children;
  let pageProperties = null;

  if (children.length > 0 && children[0].properties.public) {
    pageProperties = children.shift();
  }

  return (
    <div className="page-content">
      {pageProperties &&
        (() => {
          let ignoredProps = ['public', 'url'];

          return (
            <div className="properties">
              {Object.entries(pageProperties.properties)
                .map(([key, value]) => {
                  if (ignoredProps.indexOf(key) === -1) {
                    if (key === 'date') {
                      // Dates are always links, but we don't want it to
                      // be a link
                      value = value[0];
                    }

                    return (
                      <div>
                        <strong>{key}::</strong> <Value value={value} />
                      </div>
                    );
                  }
                  return null;
                })
                .filter(Boolean)}
            </div>
          );
        })()}

      {series && <SeriesContent series={series} />}

      {children.map(child => {
        return (
          <>
            <BlockContent block={child} root={true} />
            {child.children.length > 0 && (
              <ul>
                {child.children.map(block => (
                  <Block block={block} key={block.id} />
                ))}
              </ul>
            )}
          </>
        );
      })}
    </div>
  );
}

export function PageList({ pages }) {
  return (
    <ul className="page-list">
      {pages.length === 0 ? (
        <li className="empty">No pages</li>
      ) : (
        pages.map(page => (
          <li key={page.id}>
            <a href={`/${page.url}`}>{page.name}</a>
          </li>
        ))
      )}
    </ul>
  );
}
