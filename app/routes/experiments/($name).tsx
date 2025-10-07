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
    <div
      style={{
        height: '300px',
        overflow: 'hidden',
        border: '1px solid #ccc',
        borderRadius: 6,
        padding: 20,
      }}
    >
      {page.gif ? (
        <img
          src={page.gif || page.image}
          alt={page.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        page.title
      )}
    </div>
  );
}

export default function Links(props) {
  let { name, pages } = useLoaderData();
  return (
    <Layout name="experiments">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          gridAutoFlow: 'dense',
        }}
      >
        {pages.map(page => (
          <Experiment key={page.id} page={page} />
        ))}
      </div>
    </Layout>
  );
}
