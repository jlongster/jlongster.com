import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';

export async function loader() {
  const posts = getPages();

  const index = posts.find(post => post.url === 'index');

  // Load all posts at once
  const allPosts = posts.filter((page: any) => {
    const tags = page.tags || [];
    return !tags.includes('content');
  });

  return { allPosts, index };
}

export default function Index() {
  const { allPosts, index } = useLoaderData<typeof loader>();

  return (
    <>
      <script src="/paper-html-generator.js" />
      <script src="/paper-devtools.js" />
      <script src="/paper-animator.js" />
      <script src="/paper-renderer.js" />

      <div id="scroll-container" className="bg-[#fcfbf9] overflow-hidden">
        {/* Semantic list of all posts - will be scraped by JS
            NEVER apply display: none here, it should always be an inline script tag below*/}
        <ul id="all-posts" className="list-none">
          {(index ? [index, ...allPosts] : allPosts).map((post: any) => (
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

        <div
          style={{
            marginLeft: 800,
            marginTop: 50,
            marginRight: 200,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          className="intro"
        >
          <h1
            style={{
              color: 'var(--color-accent)',
            }}
          >
            Hello, I'm James
          </h1>
          <section style={{ fontSize: 18 }}>
            <p>
              I'm a design engineer with two decades of experience building
              products. I study everything from design to computing, and now AI.
              I created Prettier, worked for over 5 years at Stripe, and
              currently looking for my next thing.
            </p>
          </section>
        </div>

        {/* Initial block - will be populated by JS */}
        <div
          className="p-8 overflow-visible grid"
          data-block-id="0"
          style={{ height: 'min(100vh, 800px)' }}
        ></div>
      </div>
    </>
  );
}
