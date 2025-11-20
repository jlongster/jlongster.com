import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';
import { Paper } from '~/components/Paper';

export async function loader() {
  // Load initial 3 posts
  const allPosts = getPages().filter((page: any) => {
    const tags = page.tags || [];
    return !(tags.includes('content') || tags.includes('experiment'));
  });

  const initialPosts = allPosts.slice(0, 3);
  const hasMore = allPosts.length > 3;

  return { initialPosts, hasMore };
}

export default function Index() {
  const { initialPosts, hasMore } = useLoaderData<typeof loader>();

  return (
    <>
      <script src="/paper-html-generator.js" />
      <script src="/paper-animator.js" />
      <script src="/infinite-scroll.js" />
      <div id="scroll-container" className="bg-[#fcfbf9]" data-has-more={hasMore}>
        <div className="h-[800px] p-8 overflow-visible grid place-items-center" data-block-id="0">
          {initialPosts.map((post: any) => (
            <div key={post.url} className="col-start-1 row-start-1">
              <Paper title={post.title} url={post.url} rotation={0}>
                {post.abstract}
              </Paper>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
