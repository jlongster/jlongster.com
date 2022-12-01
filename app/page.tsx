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
  if (block.properties.render === 'css') {
    return (
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: block.string }}
      />
    );
  } else if (
    block.properties.render === 'js' ||
    block.properties.render === 'javascript'
  ) {
    return <script dangerouslySetInnerHTML={{ __html: block.string }} />;
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

export function Page({ page }) {
  return (
    <div className="page-content">
      {page.children.map(child => {
        if (child.properties && child.properties.public) {
          let ignoredProps = ['public', 'url'];

          return (
            <div className="properties" key={child.id}>
              {Object.entries(child.properties)
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

export function PageList({ pages }) {
  return (
    <ul className="page-list">
      {pages.length === 0 ? (
        <li className="empty">No pages</li>
      ) : (
        pages.map(page => (
          <li key={page.id}>
            <a href={`/${page.properties.url}`}>{page.name}</a>
          </li>
        ))
      )}
    </ul>
  );
}
