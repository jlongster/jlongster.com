import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';

export async function loader() {
  const pages = getPages();

  const content = [];
  const posts = [];

  for (let page of pages) {
    const tags = page.tags || [];
    if (tags.includes('content')) {
      content.push(page);
    } else {
      posts.push(page);
    }
  }

  return { content, posts };
}

export default function Index() {
  const { content, posts } = useLoaderData<typeof loader>();

  return (
    <>
      <script src="/paper-html-generator.js" />
      <script src="/paper-devtools.js" />
      <script src="/paper-animator.js" />
      <script src="/paper-renderer.js" />

      <div id="scroll-container" className="overflow-hidden bg-[#fcfbf9]">
        <div
          className="intro"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'min(100vh, 900px)',
          }}
        >
          <div style={{ width: 650 }}>
            <section style={{ fontSize: 18 }}>
              <h1>Hello, I'm James</h1>

              <p>
                I'm a design engineer with two decades of experience building
                products. I study everything from design to computing, and now
                AI. I created Prettier, worked for over 5 years at Stripe, and
                currently looking for my next thing.
              </p>

              <p>Hello</p>
            </section>
          </div>
        </div>

        <section
          style={{
            width: 1000,
            margin: '0 auto',
            position: 'relative',
            marginBottom: 500,
          }}
        >
          <h1>Posts</h1>
          <ul
            id="content-posts"
            className="posts-list list-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12"
          >
            {posts.slice(0, 6).map((post: any) => {
              const img = !!post.gif;
              return (
                <li
                  key={post.url}
                  className={`post-item border border-subdued rounded-lg ${
                    img ? '' : 'p-4'
                  }`}
                  data-url={post.url}
                  data-title={post.title}
                  data-abstract={post.abstract || ''}
                  data-image={post.gif || ''}
                >
                  {img ? (
                    <img src={post.gif} className="mt-2" />
                  ) : (
                    <>
                      <a
                        href={post.url}
                        className="font-bold text-lg uncolored-link"
                      >
                        {post.title}
                      </a>
                      {post.abstract ? (
                        <p className="text-sm text-gray-600 mt-2">
                          {post.abstract}
                        </p>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Semantic list of all posts - will be scraped by JS
            NEVER apply display: none here, it should always be an inline script tag below*/}
        {/*<PostsList
          posts={writings}
          id="all-posts"
          animationConfigs={[
            {
              animationIndex: 0,
              offsetX: 573,
              offsetY: 199,
              rotation: -43,
              scale: 1,
              startDelay: 0,
              startKeyframe: 31,
              endKeyframe: 59,
            },
            {
              animationIndex: 1,
              offsetX: 1045,
              offsetY: 51,
              rotation: -16,
              scale: 1.2,
              startDelay: 0,
              startKeyframe: 5,
              endKeyframe: 59,
            },
            {
              animationIndex: 0,
              offsetX: 564,
              offsetY: 493,
              rotation: -9,
              scale: 0.9,
              startDelay: 0,
              startKeyframe: 28,
              endKeyframe: 59,
            },
            {
              animationIndex: 1,
              offsetX: 962,
              offsetY: 408,
              rotation: -34,
              scale: 1.1,
              startDelay: 0,
              startKeyframe: 0,
              endKeyframe: 59,
            },
          ]}
          />*/}
        {/* Paper animation disabled - uncomment to re-enable */}
        {/*<script
          dangerouslySetInnerHTML={{
            __html:
              'for(let el of document.querySelectorAll(".posts-list")) { el.style.display = "none" }',
          }}
        />

        <div
          className="p-8 overflow-visible grid"
          data-block-id="0"
          data-posts-list="content-posts"
          style={{ height: 'min(100vh, 800px)' }}
        ></div>*/}
      </div>
    </>
  );
}
