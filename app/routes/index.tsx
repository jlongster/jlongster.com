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

function PostsList({
  posts,
  id,
  animationConfigs,
  paperStyle = 'text',
  width = 250,
  height = 300,
}: {
  posts: any[];
  id?: string;
  animationConfigs?: any[];
  paperStyle?: 'text' | 'image';
  width?: number;
  height?: number;
}) {
  return (
    <ul
      id={id}
      className="posts-list list-none"
      data-animation-configs={
        animationConfigs ? JSON.stringify(animationConfigs) : undefined
      }
      data-paper-style={paperStyle}
      data-paper-width={width}
      data-paper-height={height}
    >
      {posts.map((post: any) => (
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
  );
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

        <section style={{ width: 800, margin: '0 auto', position: 'relative' }}>
          <h1>Posts</h1>
          <PostsList posts={posts} id="content-posts" />
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
        <script
          dangerouslySetInnerHTML={{
            __html:
              'for(let el of document.querySelectorAll(".posts-list")) { el.style.display = "none" }',
          }}
        />

        {/* Initial block - will be populated by JS */}
        <div
          className="p-8 overflow-visible grid"
          data-block-id="0"
          data-posts-list="content-posts"
          style={{ height: 'min(100vh, 800px)' }}
        ></div>
      </div>
    </>
  );
}
