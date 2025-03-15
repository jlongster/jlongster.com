import { useLoaderData } from '@remix-run/react';
import { getPages } from '../db/queries';
import { PageList, formatDate } from '../page';
import { Layout } from '../layout';

export async function loader({ params }) {
  let pages = getPages();
  return { pages };
}

function PageGrid({ pages }) {
  return (
    <div className="posts-grid">
      {pages.map(page => {
        const imgUrl = page['featured-image'];

        return (
          <a key={page.uuid} href={`/${page.url}`} className="post-item">
            {imgUrl && <img src={imgUrl} alt="" />}
            <div className="post-title">{page.title}</div>
            {page.subtitle && (
              <div className="post-subtitle">{page.subtitle}</div>
            )}

            <div className="date">{formatDate(page.date)}</div>
          </a>
        );
      })}
    </div>
  );
}

export default function Index() {
  let { pages } = useLoaderData();
  const latestPages = pages.slice(0, 6);

  return (
    <Layout name="home">
      <div className="bleed">
        <div style={{ top: 0, zIndex: -1 }}>
          <canvas />
        </div>
      </div>

      <h1>This is my sketchbook.</h1>

      <div className="hero">
        <div className="description">
          <p class="bio">
            Building at the intersection of code and creativity. Exploring
            compilers, graphics, and interactive experiences. Staff Engineer at
            Stripe, creator of <a href="https://prettier.io">Prettier</a>, made
            databases work on the web with{' '}
            <a href="https://jlongster.com/future-sql-web">absurd-sql</a>.
          </p>
          <p style={{ fontStyle: 'italic' }}>
            P.S. I have a{' '}
            <a href="https://buttondown.email/jlongster">newsletter</a> if you
            want content in your email.
          </p>
        </div>
      </div>

      {latestPages.length > 0 && <PageGrid pages={latestPages} />}
      <div className="reading-list">
        <h3>All posts</h3>
        <PageList pages={pages} />
      </div>
      <script type="module" src="/index-demo.js" />
    </Layout>
  );
}
