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
      <div className="max-w-6xl mx-auto relative min-h-[800px] flex flex-wrap justify-center content-start gap-8 py-20">
        {posts.map((post: any, index: number) => {
          // Deterministic pseudo-random rotation based on index
          const rotation = ((index * 137.5) % 30) - 15;

          return (
            <Paper
              key={post.url}
              title={post.title}
              url={post.url}
              rotation={rotation}
            />
          );
        })}
      </div>
    </div>
  );
}
