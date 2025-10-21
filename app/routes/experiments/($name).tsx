import { useLoaderData } from '@remix-run/react';
import * as queries from '../../db/queries';
import { Layout } from '../../layout';
import { PageList } from '../../page';

export async function loader({ params }) {
  let name = params['name'];
  let pages = queries.getPagesWithTag('experiment');

  pages = pages.filter(page => (page.tags || []).includes('experiment'));

  return { name, pages };
}

function Experiment({ page }) {
  return (
    <a
      href={page.url}
      className="block shadow-sm hover:shadow-lg hover:-translate-y-[3px] transition-all ease-in-out"
      style={{
        height: '300px',
        overflow: 'hidden',
        borderRadius: 6,
      }}
    >
      {page.gif ? (
        <img
          src={page.gif}
          alt={page.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        `James, you need to add a gif here for "${page.title}"`
      )}
    </a>
  );
}

export default function Links(props) {
  let { name, pages } = useLoaderData();
  return (
    <Layout name="experiments" minimal>
      <div
        className="mt-[130px] mx-[100px] grid grid-cols-1 md:grid-cols-3 gap-5 grid-flow-dense"
      >
        {pages.map(page => (
          <Experiment key={page.id} page={page} />
        ))}
      </div>
    </Layout>
  );
}
