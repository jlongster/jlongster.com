import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';

export async function loader() {
  const pages = getPages();

  const content = [];
  const writings = [];
  const experiments = [];

  for (let page of pages) {
    const tags = page.tags || [];
    if (tags.includes('content')) {
      content.push(page);
    } else if (tags.includes('experiment')) {
      experiments.push(page);
    } else {
      writings.push(page);
    }
  }

  return { content, writings, experiments };
}

function PostsList({
  posts,
  id,
  className,
  animationConfigs,
  groupName,
  style,
}: {
  posts: any[];
  id?: string;
  className?: string;
  animationConfigs?: any[];
  groupName?: string;
  style: any;
}) {
  return (
    <div
      id={id}
      className={className}
      data-paper-group={groupName}
      data-paper-scroll-animate
      style={style}
    >
      {posts.map((post: any, index: number) => {
        const animationConfig = animationConfigs?.[index];
        const paperStyle = post['preview-vid'] ? 'image' : 'text';

        return (
          <Paper
            key={post.url}
            animationConfig={animationConfig}
            paperStyle={paperStyle}
          >
            {post['preview-vid'] ? (
              <>
                <div
                  className="w-full h-full object-cover"
                  data-video-src={post['preview-vid']}
                />
                <img
                  src={`https://d3ui957tjb5bqd.cloudfront.net/op/font-preview/291939758/2/14?s=%7B%22size%22%3A48%2C%22text%22%3A%22${post.title}%22%2C%22retina%22%3Atrue%7D`}
                  style={{ height: 18, marginTop: 13, marginLeft: 10 }}
                />
              </>
            ) : (
              <>
                <a href={post.url} className="font-bold text-lg block mb-2">
                  {post.title}
                </a>
                {post.abstract ? (
                  <p className="text-sm mt-2">{post.abstract}</p>
                ) : null}
              </>
            )}
          </Paper>
        );
      })}
    </div>
  );
}

type AnimationConfig = {
  animationIndex: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  startDelay: number;
  startKeyframe: number;
  endKeyframe: number;
};

function Paper({
  children,
  animationConfig,
  paperStyle = 'text',
}: {
  children: React.ReactNode;
  animationConfig?: AnimationConfig;
  paperStyle?: 'text' | 'image';
}) {
  const config = animationConfig || {
    animationIndex: 0,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1,
    startDelay: 0,
    startKeyframe: 0,
    endKeyframe: 59,
  };

  return (
    <div
      className="paper-component"
      data-paper-style={paperStyle}
      data-animation-index={config.animationIndex}
      data-offset-x={config.offsetX}
      data-offset-y={config.offsetY}
      data-rotation={config.rotation}
      data-scale={config.scale}
      data-start-delay={config.startDelay}
      data-start-keyframe={config.startKeyframe}
      data-end-keyframe={config.endKeyframe}
    >
      {children}
    </div>
  );
}

export default function Index() {
  const { content, experiments, writings } = useLoaderData<typeof loader>();

  return (
    <>
      <script src="/paper-devtools.js" />
      <script src="/shadow-renderer.js" />
      <script src="/paper-animator.js?v=7" />
      <script src="/paper-renderer.js?v=3" />

      <div id="scroll-container" className="overflow-hidden bg-[#fcfbf9]">
        <div
          className="intro relative"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'min(80vh, 800px)',
          }}
        >
          <div className="relative z-10 max-w-2xl px-6">
            <section className="text-lg md:text-xl leading-relaxed">
              <h1
                className="text-5xl md:text-7xl mb-8 text-primary"
                style={{
                  fontFamily: 'Playfair Display',
                  fontWeight: 700,
                }}
              >
                Hello, I'm <span className="text-accent">James Long</span>
              </h1>

              <div className="space-y-6 text-primary/90">
                <p>
                  I'm a <span className="font-semibold">design engineer</span>{' '}
                  with two decades of experience building products. I study
                  everything from design to computing, and now AI.
                </p>
                <p>
                  I created{' '}
                  <a
                    href="https://prettier.io"
                    className="text-link hover:text-accent transition-colors duration-200"
                  >
                    Prettier
                  </a>
                  , worked for over 5 years at{' '}
                  <a
                    href="https://stripe.com"
                    className="text-link hover:text-accent transition-colors duration-200"
                  >
                    Stripe
                  </a>
                  , and currently looking for my next thing.
                </p>
              </div>
            </section>
          </div>
        </div>

        <section className="max-w-6xl mx-auto px-6 pb-32 relative">
          <h1
            className="font-serif text-4xl font-bold"
            style={{
              fontFamily: 'Playfair Display',
            }}
          >
            Posts
          </h1>

          <div className="flex">
            <div className="flex-1 flex flex-col items-start">
              <ul id="content-posts" className="posts-list py-4 mt-12 w-full">
                {writings.slice(0, 3).map((post: any, i: number) => {
                  const img = !!post.gif;

                  return (
                    <li
                      key={post.url}
                      className={`post-item group relative flex flex-col`}
                      data-url={post.url}
                      data-title={post.title}
                      data-image={post.gif || ''}
                    >
                      <a href={post.url} className="uncolored-link">
                        {img ? (
                          <div className="aspect-video w-full overflow-hidden bg-gray-50">
                            <img
                              src={post.gif}
                              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                              alt=""
                            />
                          </div>
                        ) : null}

                        <div className="py-6 flex flex-col flex-grow">
                          <h2 style={{ margin: 0, marginBottom: 8 }}>
                            {post.title}
                          </h2>

                          {post.date && (
                            <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                              {new Date(post.date).toLocaleDateString(
                                undefined,
                                {
                                  year: 'numeric',
                                  month: 'short',
                                },
                              )}
                            </span>
                          )}
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <a
                href="/posts"
                className="uncolored-link bg-primary px-6 py-3 rounded-lg hover:opacity-90 transition-opacity mt-4"
              >
                <span className="text-white">Read more</span>
              </a>
            </div>

            <Paper
              animationConfig={{
                animationIndex: 0,
                offsetX: -330,
                offsetY: 4,
                rotation: -22,
                scale: 1,
                startDelay: 0,
                startKeyframe: 29,
                endKeyframe: 59,
              }}
            >
              <p>I enjoy breaking down complex topics writing about them.</p>
              <p>Recently I've been trying to work on my design</p>
              <p>- James</p>
            </Paper>
          </div>
        </section>

        <PostsList
          posts={experiments.concat(experiments)}
          id="experiments"
          groupName="experiments"
          style={{ marginTop: 200, marginBottom: 300, minHeight: '100vh' }}
          animationConfigs={[
            {
              animationIndex: 3,
              offsetX: 695,
              offsetY: -34,
              rotation: -5,
              scale: 1.3,
              startDelay: 200,
              startKeyframe: 0,
              endKeyframe: 59,
            },
            {
              animationIndex: 3,
              offsetX: 983,
              offsetY: 295,
              rotation: 0,
              scale: 1.3,
              startDelay: 800,
              startKeyframe: 0,
              endKeyframe: 59,
            },
            {
              animationIndex: 3,
              offsetX: 733,
              offsetY: 318,
              rotation: -6,
              scale: 1.3,
              startDelay: 600,
              startKeyframe: 0,
              endKeyframe: 59,
            },
            {
              animationIndex: 3,
              offsetX: 973,
              offsetY: -45,
              rotation: 8,
              scale: 1.3,
              startDelay: 400,
              startKeyframe: 0,
              endKeyframe: 59,
            },
          ]}
        />

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
        <script
          dangerouslySetInnerHTML={{
            __html:
              'for(let el of document.querySelectorAll(".paper-component")) { el.style.display = "none" }',
          }}
        />

        {/*<div
          className="p-8 overflow-visible grid"
          data-block-id="0"
          data-posts-list="content-posts"
          style={{ height: 'min(100vh, 800px)' }}
        ></div>*/}
      </div>
    </>
  );
}
