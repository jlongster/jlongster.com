import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';

export async function loader() {
  const posts = getPages();

  const content = [];
  const experiments = [];
  const writings = [];

  for (let post of posts) {
    const tags = post.tags || [];
    if (tags.includes('content')) {
      content.push(post);
    } else if (tags.includes('experiment')) {
      experiments.push(post);
    } else {
      writings.push(post);
    }
  }

  // Remove the first writing and put it on to the content (it doesn't
  // matter which order it goes)
  content.push(writings.shift());

  return { content, experiments, writings };
}

function PostsList({
  posts,
  id,
  animationConfigs,
}: {
  posts: any[];
  id?: string;
  animationConfigs?: any[];
}) {
  return (
    <ul
      id={id}
      className="posts-list list-none"
      data-animation-configs={
        animationConfigs ? JSON.stringify(animationConfigs) : undefined
      }
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
  const { content, experiments, writings } = useLoaderData<typeof loader>();

  return (
    <>
      <script src="/paper-html-generator.js" />
      <script src="/paper-devtools.js" />
      <script src="/paper-animator.js" />
      <script src="/paper-renderer.js" />

      <div id="scroll-container" className="overflow-hidden bg-[#fcfbf9]">
        <div
          style={{
            position: 'relative',
            height: 'min(900px, 100vh)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '66.67%',
              transform: 'translateX(-50%)',
              top: 100,
            }}
            className="intro"
          >
            <div style={{ width: 500 }}>
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
                  products. I study everything from design to computing, and now
                  AI. I created Prettier, worked for over 5 years at Stripe, and
                  currently looking for my next thing.
                </p>

                <PostsList
                  posts={content}
                  id="content-posts"
                  animationConfigs={[
                    {
                      animationIndex: 0,
                      offsetX: 199,
                      offsetY: -1,
                      rotation: 0,
                      scale: 0.8,
                      startDelay: 3500,
                      startKeyframe: 31,
                      endKeyframe: 59,
                    },
                    {
                      animationIndex: 0,
                      offsetX: 145,
                      offsetY: 108,
                      rotation: -22,
                      scale: 0.8,
                      startDelay: 3500,
                      startKeyframe: 28,
                      endKeyframe: 59,
                    },
                    {
                      animationIndex: 0,
                      offsetX: 146,
                      offsetY: 222,
                      rotation: -50,
                      scale: 0.8,
                      startDelay: 3500,
                      startKeyframe: 25,
                      endKeyframe: 59,
                    },
                    {
                      animationIndex: 0,
                      offsetX: -352,
                      offsetY: -108,
                      rotation: -43,
                      scale: 1,
                      startDelay: 0,
                      startKeyframe: 0,
                      endKeyframe: 59,
                    },
                  ]}
                />
              </section>
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            height: 'min(900px, 100vh)',
          }}
        >
          <PostsList
            posts={experiments}
            id="experiments-posts"
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
          />
        </div>

        {/* Semantic list of all posts - will be scraped by JS
            NEVER apply display: none here, it should always be an inline script tag below*/}
        <PostsList
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
        />
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
          data-posts-list="all-posts"
          style={{ height: 'min(100vh, 800px)' }}
        ></div>
      </div>
    </>
  );
}
