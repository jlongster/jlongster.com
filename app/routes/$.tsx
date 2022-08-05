import { useLoaderData } from '@remix-run/react';
import { renderBlock } from '../md';
import * as db from '../db/website';

export async function loader({ params }) {
  let pageUrl = params['*'];

  let { page, refs } = db.getPage(pageUrl);
  if (page == null) {
    throw new Response('Page not found', { status: 404 });
  }

  renderBlock(page);
  // for (let backref of page.backrefs) {
  //   renderBlock(backref.block);
  // }

  // page.backrefs.sort((r1, r2) => r2.editTime - r1.editTime);
  // page.backrefs = groupByArray(page.backrefs, 'pageId');

  return { page, refs };
}

function Value({ value }) {
  if (Array.isArray(value)) {
    return (
      <span className="link-list">
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

function Page({ page }) {
  return page.children.map(child => {
    if (child.properties && child.properties.public) {
      let ignoredProps = ['public', 'url'];

      return (
        <div className="properties">
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
        <p dangerouslySetInnerHTML={{ __html: child.string }} />
        {child.children.length > 0 && (
          <ul>
            {child.children.map(block => (
              <Block block={block} />
            ))}
          </ul>
        )}
      </>
    );
  });
}

function Block({ block }) {
  return (
    <li>
      <span dangerouslySetInnerHTML={{ __html: block.string }} />
      {block.children.length > 0 && (
        <ul>
          {block.children.map(child => (
            <Block block={child} />
          ))}{' '}
        </ul>
      )}
    </li>
  );
}

export default function RenderPage(props) {
  let { page } = useLoaderData();
  return (
    <>
      <header>
        <a href="/">home</a>
      </header>
      <main>
        <Page page={page} />
      </main>
    </>
  );
}
