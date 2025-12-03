import { useLoaderData } from '@remix-run/react';
import { getPages, getBlocks } from '~/db/queries';
import { Layout } from '../layout';
import * as db from '../db';
import { Blocks } from '../blocks';

export async function loader() {
  const pages = getPages();

  const content = [];
  const notes = [];
  const experiments = [];

  for (let page of pages) {
    const tags = page.tags || [];
    // if (tags.includes('note')) {
    if (!tags.includes('content') && !tags.includes('experiment')) {
      notes.push(page);
    }
  }

  return {
    notes: notes.map(note => {
      let conn = db.load(note.url);
      if (conn == null) {
        return null;
      }

      return { ...note, blocks: getBlocks(conn) };
    }),
  };
}

export default function Index() {
  const { notes } = useLoaderData<typeof loader>();

  return (
    <Layout
      showSidebarInMobile
      sidebar={
        <div>
          <h2 className="!mt-0 !mb-8">
            <a href="/about">About</a>
          </h2>

          <p>
            Hello! I’m <a href="https://twitter.com/jlongster">James Long</a>.
            I'm a design engineer with over 2 decades of experience across the
            whole stack.
          </p>

          <p>
            You might know me as the creator of Prettier, absurd-sql, Actual, or
            maybe something else. View my <a href="/work">work</a> or learn more{' '}
            <a href="/about">about</a> me.
          </p>
        </div>
      }
    >
      {notes.slice(0, 10).map(note => {
        return (
          <div className="mb-[100px]">
            <h2 className="!mb-8 !mt-0">
              <a href={note.url}>{note.title}</a>
            </h2>

            <div className="[&_p:first-of-type]:my-0 [&_p:last-of-type]:mb-0 [&_p]:my-6">
              <Blocks
                blocks={note.blocks.slice(0, 5).filter(block => {
                  return !(block.type === 'code' && block.meta.lang === 'css');
                })}
                pageid={note.url}
              />
            </div>

            <a href={note.url} className="uncolored-link !text-white mt-[1.5em] inline-block py-[0.5em] px-[1em] bg-primary text-white rounded no-underline font-bold">
              Read more →
            </a>
          </div>
        );
      })}

      <a href="/posts" className="mt-[100px] itaic">
        These are the latest 10 posts. View all posts from the beginning of time
      </a>
    </Layout>
  );
}
