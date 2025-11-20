import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';

export async function loader() {
  // Load all posts at once
  const allPosts = getPages().filter((page: any) => {
    const tags = page.tags || [];
    return !tags.includes('content');
  });

  return { allPosts };
}

export default function Index() {
  const { allPosts } = useLoaderData<typeof loader>();

  return (
    <>
      <script src="/paper-html-generator.js" />
      <script src="/paper-devtools.js" />
      <script src="/paper-animator.js" />
      <script src="/paper-renderer.js" />

      <div id="scroll-container" className="bg-[#fcfbf9]">
        {/* Semantic list of all posts - will be scraped by JS
            NEVER apply display: none here, it should always be an inline script tag below*/}
        <ul id="all-posts" className="list-none">
          {allPosts.map((post: any) => (
            <li
              key={post.url}
              className="post-item"
              data-url={post.url}
              data-title={post.title}
              data-abstract={post.abstract || ''}
              data-image={post.gif || ''}
            >
              <a href={post.url} className="font-bold text-2xl">
                {post.title}
              </a>
              {post.gif ? <img src={post.gif} /> : null}
              {post.abstract ? (
                <p className="text-sm text-gray-600">{post.abstract}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.getElementById("all-posts").style.display = "none"',
          }}
        />

        {/* Initial block - will be populated by JS */}
        <div
          className="h-[800px] p-8 overflow-visible grid place-items-center"
          data-block-id="0"
        ></div>
      </div>
    </>
  );
}
