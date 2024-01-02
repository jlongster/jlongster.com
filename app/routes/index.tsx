import { useLoaderData } from '@remix-run/react';
import { PageList } from '../page';
import { getPages } from '../db/website';
import { Layout } from '../layout';

export async function loader({ params }) {
  let sketches = getPages({ tags: ['sketchbook'] });
  let featured = sketches
    .filter(page => !!page.properties['featured-image'])
    .slice(0, 3);
  return { sketches, featured };
}

function Featured({ pages }) {
  return (
    <div className={'featured-list ' + (pages.length > 2 ? 'breakout' : '')}>
      {pages.map(page => {
        const imgText = page.properties['featured-image'];
        // Match the part inside parens of [](...)
        const match = imgText.match(/\]\((.*)\)/);
        let imgUrl;
        if (match) {
          imgUrl = match[1];
        }

        return (
          <a key={page.uuid} href={`/${page.url}`} className="featured-item">
            {imgUrl && <img src={imgUrl} alt="" />}
            <div className="featured-title">{page.name}</div>
          </a>
        );
      })}
    </div>
  );
}

export default function Index() {
  let { sketches, featured } = useLoaderData();
  return (
    <Layout>
      <h1>Welcome to my sketchbook</h1>
      {featured.length > 0 && <Featured pages={featured} />}
      <PageList pages={sketches} />
    </Layout>
  );
}
