import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';
import { Paper } from '~/components/Paper';

export async function loader() {
  const posts = getPages()
    .filter((page: any) => {
      const tags = page.tags || [];
      return !(tags.includes('content') || tags.includes('experiment'));
    })
    .slice(0, 15);

  return { posts };
}

export default function Index() {
  const { posts } = useLoaderData() as { posts: any[] };

  return (
    <div className="min-h-screen bg-[#fcfbf9] p-8 overflow-visible">
      <script src="/paper-animator.js" />
      <div className="max-w-6xl mx-auto relative min-h-[800px] py-20">
        {posts.map((post: any, index: number) => {
          return (
            <div key={post.url} className="absolute top-0 left-1/2 -translate-x-1/2">
              <Paper
                title={post.title}
                url={post.url}
                rotation={0}
              >
                {post.abstract}
              </Paper>
            </div>
          );
        })}
      </div>
    </div>
  );
}
