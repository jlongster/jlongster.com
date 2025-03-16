import React from 'react';
import { useLoaderData } from '@remix-run/react';
import { getPages } from '../db/queries';
import * as db from '../db';
import { getBlocks } from '../db/queries';
import { EnhancedPageList, formatDate } from '../page';
import { Blocks } from '../blocks';
import { Layout } from '../layout';

export async function loader({ params }) {
  let pages = getPages();
  let conn = db.load('studying');
  return { pages, studyingBlocks: getBlocks(conn) };
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
  let { pages, studyingBlocks } = useLoaderData();
  const latestPages = pages.slice(0, 6);

  return (
    <Layout name="home">
      <div className="bleed">
        <div style={{ top: 0, zIndex: -1 }}>
          <canvas />
        </div>
      </div>

      <div className="hero">
        <h1>This is my sketchbook.</h1>

        <div className="description">
          <p className="bio">
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
      <div className="two-column">
        <div className="reading-list">
          <h3>More to read</h3>
          <EnhancedPageList pages={pages} />
          
          <a className="view-all" href="/links">View all posts</a>
        </div>

        <div className="studying">
          <h3>Things I'm studying</h3>
          <div class="raw-list">
            <Blocks blocks={studyingBlocks} />
          </div>
        </div>
      </div>
      <script type="module" src="/index-demo.js" />
    </Layout>
  );
}
