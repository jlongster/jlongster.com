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
    <div className="min-h-screen bg-[#fcfbf9] p-8 overflow-hidden">
      <script src="/paper-position-tool.js" />
      <script src="/video-player.js" />
      <div className="max-w-6xl mx-auto relative min-h-[800px] flex flex-wrap justify-center content-start gap-8 py-20">
        {posts.slice(0, 1).map((post: any, index: number) => {
          return (
            <Paper
              key={post.url}
              title={post.title}
              url={post.url}
              rotation={0}
            />
          );
        })}
      </div>
    </div>
  );
}
