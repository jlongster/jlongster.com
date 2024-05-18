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
            {page.properties.subtitle && (
              <div className="featured-subtitle">
                {page.properties.subtitle}
              </div>
            )}

            <div className="date">{page.properties.date[0]}</div>
          </a>
        );
      })}
    </div>
  );
}

export default function Index() {
  let { sketches, featured } = useLoaderData();
  return (
    <Layout name="home">
      <h1>This is my sketchbook.</h1>
      <div className="hero">
        <div className="description">
          <p>
            I like to experiment with technology and art. I write about
            compilers, color theory, and much more. My past: created{' '}
            <a href="https://prettier.io">prettier</a>, made databases work on
            the web with{' '}
            <a href="https://jlongster.com/future-sql-web">absurd-sql</a>, and
            more. Currently at <a href="https://stripe.com">Stripe</a>.
          </p>
          <p>
            -{' '}
            <a target="_blank" href="https://twitter.com/jlongster">
              James
            </a>
          </p>
          <p style={{ fontStyle: 'italic' }}>
            P.S. I have a{' '}
            <a href="https://buttondown.email/jlongster">newsletter</a> if you
            want content in your email.
          </p>
        </div>
        <div id="demo" />
      </div>
      {featured.length > 0 && <Featured pages={featured} />}
      <div className="reading-list">
        <h3>Also worth reading</h3>
        <PageList pages={sketches} />
      </div>
      <script type="module" src="/index-demo.js" />
    </Layout>
  );
}
