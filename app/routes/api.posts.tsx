import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { getPages } from '~/db/queries';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const limit = parseInt(url.searchParams.get('limit') || '3', 10);

  const allPosts = getPages().filter((page: any) => {
    const tags = page.tags || [];
    return !(tags.includes('content') || tags.includes('experiment'));
  });

  const posts = allPosts.slice(offset, offset + limit);
  const hasMore = offset + limit < allPosts.length;

  return json({ posts, hasMore, total: allPosts.length });
}
