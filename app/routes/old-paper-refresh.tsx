import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';

import styles from '~/css/old-paper-refresh.css?url';

export function links() {
  return [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
    },
    {
      rel: 'stylesheet',
      href: styles,
    },
  ];
}

export async function loader() {
  const pages = getPages();

  const content = [];
  const notes = [];
  const experiments = [];

  for (let page of pages) {
    const tags = page.tags || [];
    if (tags.includes('content')) {
      content.push(page);
    } else if (tags.includes('experiment')) {
      experiments.push(page);
    } else {
      notes.push(page);
    }
  }

  return { content, notes, experiments };
}

function PostsList({
  posts,
  id,
  className,
  animationConfigs,
  animConfigs,
  groupName,
  style,
}: {
  posts: any[];
  id?: string;
  className?: string;
  animationConfigs?: any[];
  animConfigs?: PaperAnimConfig[];
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
        const animConfig = animConfigs?.[index];
        const paperStyle = post['preview-vid'] ? 'image' : 'text';

        return (
          <Paper
            key={post.url}
            animationConfig={animationConfig}
            animConfig={animConfig}
            paperStyle={paperStyle}
          >
            {post['preview-vid'] ? (
              <>
                <div
                  className="w-full h-full object-cover"
                  data-video-src={post['preview-vid']}
                />
                <div
                  style={{
                    fontFamily: 'Handero',
                    marginLeft: 10,
                    fontSize: 20,
                    marginTop: 10,
                  }}
                >
                  {post.title}
                </div>
              </>
            ) : (
              <>
                <a
                  href={post.url}
                  className="font-bold text-lg block mb-2"
                  style={{ fontFamily: 'Handero', fontSize: 30 }}
                >
                  {post.title}
                </a>
                {/*post.abstract ? (
                  <p className="text-sm mt-2">{post.abstract}</p>
                  ) : null*/}
              </>
            )}
          </Paper>
        );
      })}
    </div>
  );
}

type AnimationConfig = {
  animationName: string;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  startKeyframe: number;
  endKeyframe: number;
};

type PaperAnimConfig = {
  group: string;
  delay?: number;
  trigger?: 'scroll' | 'load' | 'manual';
  scrollTarget?: string; // CSS selector for parent element to observe
  scrollThreshold?: number; // 0-1, percentage of element that must be visible (default 0.2)
};

function Paper({
  children,
  animationConfig,
  animConfig,
  paperStyle = 'text',
  anim,
}: {
  children: React.ReactNode;
  animationConfig?: AnimationConfig;
  animConfig?: PaperAnimConfig;
  paperStyle?: 'text' | 'image';
  anim?: PaperAnimConfig;
}) {
  // Support both anim and animConfig props (animConfig takes precedence)
  const animProps = animConfig || anim;
  const config = animationConfig || {
    animationName: 'floating',
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1,
    startKeyframe: 0,
    endKeyframe: 59,
  };

  return (
    <div
      className="paper-component"
      data-paper-style={paperStyle}
      data-animation-name={config.animationName}
      data-offset-x={config.offsetX}
      data-offset-y={config.offsetY}
      data-rotation={config.rotation}
      data-scale={config.scale}
      data-start-keyframe={config.startKeyframe}
      data-end-keyframe={config.endKeyframe}
      data-anim-group={animProps?.group}
      data-anim-delay={animProps?.delay}
      data-anim-type="paper"
      data-anim-trigger={animProps?.trigger}
      data-anim-scroll-target={animProps?.scrollTarget}
      data-anim-scroll-threshold={animProps?.scrollThreshold}
    >
      {children}
    </div>
  );
}

type TextPositionConfig = {
  top?: number | string;
  left?: number | string;
};

type ArrowConfig = {
  name: string;
  top?: number | string;
  left?: number | string;
  transform?: string;
  scale?: number;
};

type AnimConfig = {
  group: string;
  textDelay?: number;
  arrowDelay?: number;
  trigger?: 'scroll' | 'load' | 'manual';
  scrollTarget?: string; // CSS selector for parent element to observe
  scrollThreshold?: number; // 0-1, percentage of element that must be visible (default 0.2)
};

function CanvasText({
  children,
  position,
  arrow,
  color,
  rotation,
  anim,
}: {
  children: React.ReactNode;
  position: TextPositionConfig;
  arrow?: ArrowConfig;
  color?: string;
  rotation?: number;
  anim?: AnimConfig;
}) {
  const transform = rotation ? `rotate(${rotation}deg)` : undefined;

  return (
    <>
      <div
        data-canvas-text="true"
        data-position={JSON.stringify(position)}
        data-arrow={arrow ? JSON.stringify(arrow) : undefined}
        data-anim-group={anim?.group}
        data-anim-delay={anim?.textDelay}
        data-anim-type="text"
        data-anim-trigger={anim?.trigger}
        data-anim-scroll-target={anim?.scrollTarget}
        data-anim-scroll-threshold={anim?.scrollThreshold}
        style={{
          position: 'absolute',
          fontSize: 23,
          color,
          transform,
          ...position,
        }}
      >
        {children}
      </div>
      {arrow && (
        <div
          data-canvas-text-arrow="true"
          data-arrow-name={arrow.name}
          data-anim-group={anim?.group}
          data-anim-delay={anim?.arrowDelay}
          data-anim-type="arrow"
          data-anim-trigger={anim?.trigger}
          data-anim-scroll-target={anim?.scrollTarget}
          data-anim-scroll-threshold={anim?.scrollThreshold}
          style={{
            position: 'absolute',
            top: arrow.top,
            left: arrow.left,
            transform: arrow.transform
              ? arrow.scale
                ? `${arrow.transform} scale(${arrow.scale})`
                : arrow.transform
              : arrow.scale
              ? `scale(${arrow.scale})`
              : undefined,
            color: color,
          }}
        />
      )}
    </>
  );
}

export default function Index() {
  const { content, experiments, notes } = useLoaderData<typeof loader>();

  return (
    <>
      <script src="/old-paper-refresh/paper-devtools.js" />
      <script src="/old-paper-refresh/text-devtools.js" />
      <script src="/old-paper-refresh/shadow-renderer.js" />
      <script src="/old-paper-refresh/paper-animator.js?v=7" />
      <script src="/old-paper-refresh/paper-renderer.js?v=3" />
      <script src="/old-paper-refresh/paper-animation-editor.js" />
      <script src="/old-paper-refresh/arrow-animator.js" />
      <script src="/old-paper-refresh/animation-coordinator.js" />
      <script src="/old-paper-refresh/anim-devtools.js" />

      <div id="scroll-container" className="overflow-hidden bg-[#fcfbf9]">
        <div
          style={{
            paddingTop: 10,
            textAlign: 'center',
            color: '#c4baa1',
            fontWeight: 300,
          }}
        >
          [WIP] This site was was an attempt at a visual refresh that I paused. No mobile support.
        </div>
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
            <section className="">
              <Paper
                animationConfig={{
                  animationName: 'floating',
                  startKeyframe: 10,
                  offsetX: -43,
                  offsetY: -230,
                  rotation: -17,
                  scale: 0.9,
                  endKeyframe: 35,
                }}
                anim={{
                  group: 'intro',
                  delay: 0,
                  trigger: 'load',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  <p>Hello!</p>
                  <div style={{ height: 50 }} />
                </div>
              </Paper>

              <CanvasText
                position={{
                  top: 201,
                  left: -362,
                }}
                arrow={{
                  name: 'up-right',
                  top: -36,
                  left: -464,
                  scale: 0.4,
                }}
                color="rgb(249, 141, 47)"
                rotation={-11}
                anim={{
                  group: 'intro',
                  textDelay: 1500,
                  arrowDelay: 1800,
                  trigger: 'load',
                }}
              >
                Open it!
              </CanvasText>
            </section>
          </div>
        </div>

        <div
          id="experiments-trigger"
          style={{
            marginTop: 200,
            marginBottom: 0,
            minHeight: 'min(100vh, 900px)',
            position: 'relative',
          }}
        >
          <PostsList
            posts={experiments}
            id="experiments"
            groupName="experiments"
            animationConfigs={[
              {
                animationName: 'small-flop',
                offsetX: 695,
                offsetY: -34,
                rotation: -5,
                scale: 1.3,
                startKeyframe: 0,
                endKeyframe: 59,
              },
              {
                animationName: 'small-flop',
                offsetX: 983,
                offsetY: 295,
                rotation: 0,
                scale: 1.3,
                startKeyframe: 0,
                endKeyframe: 59,
              },
              {
                animationName: 'small-flop',
                offsetX: 733,
                offsetY: 318,
                rotation: -6,
                scale: 1.3,
                startKeyframe: 0,
                endKeyframe: 59,
              },
              {
                animationName: 'small-flop',
                offsetX: 973,
                offsetY: -45,
                rotation: 8,
                scale: 1.3,
                startKeyframe: 0,
                endKeyframe: 59,
              },
            ]}
            animConfigs={[
              {
                group: 'experiments',
                delay: 0,
                trigger: 'scroll',
                scrollTarget: '#experiments-trigger',
                scrollThreshold: 0.6,
              },
              {
                group: 'experiments',
                delay: 600,
                trigger: 'scroll',
                scrollTarget: '#experiments-trigger',
                scrollThreshold: 0.6,
              },
              {
                group: 'experiments',
                delay: 400,
                trigger: 'scroll',
                scrollTarget: '#experiments-trigger',
                scrollThreshold: 0.6,
              },
              {
                group: 'experiments',
                delay: 200,
                trigger: 'scroll',
                scrollTarget: '#experiments-trigger',
                scrollThreshold: 0.6,
              },
            ]}
          />

          <CanvasText
            position={{
              top: 294,
              left: 985,
            }}
            arrow={{
              name: 'down-left',
              top: 254,
              left: 898,
              scale: 0.4,
            }}
            color="rgb(249, 141, 47)"
            rotation={8}
            anim={{
              group: 'experiments',
              textDelay: 600,
              arrowDelay: 650,
              trigger: 'scroll',
              scrollTarget: '#experiments-trigger',
              scrollThreshold: 0.6,
            }}
          >
            Some experiments I've worked on
          </CanvasText>
        </div>

        <div
          className="writing-stuff"
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '900px',
            margin: '0 auto',
            gap: 50,
          }}
        >
          <div style={{ position: 'relative', height: 600 }}>
            <h1
              className="font-serif text-4xl font-bold"
              style={{
                fontFamily:
                  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont',
              }}
            >
              Work
            </h1>

            <Paper
              animationConfig={{
                animationName: 'floating',
                offsetX: 78,
                offsetY: 6,
                rotation: -17,
                scale: 0.9,
                startKeyframe: 10,
                endKeyframe: 35,
              }}
              anim={{
                group: 'intro',
                delay: 0,
                trigger: 'load',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  flexDirection: 'column',
                  fontSize: 20,
                }}
              >
                <p>Resume</p>
                <div style={{ height: 50 }} />
              </div>
            </Paper>
            <Paper
              animationConfig={{
                animationName: 'floating',
                offsetX: 457,
                offsetY: 27,
                rotation: -17,
                scale: 0.9,
                startKeyframe: 10,
                endKeyframe: 35,
              }}
              anim={{
                group: 'intro',
                delay: 0,
                trigger: 'load',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  flexDirection: 'column',
                  fontSize: 20,
                }}
              >
                <p>Projects & experience</p>
                <div style={{ height: 50 }} />
              </div>
            </Paper>
          </div>

          <div style={{ flex: 1, marginBottom: 100 }}>
            <h1
              className="font-serif text-4xl font-bold"
              style={{
                fontFamily:
                  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont',
              }}
            >
              Notes
            </h1>

            <div className="flex">
              <div className="flex-1 flex flex-col items-start">
                <ul id="content-posts" className="posts-list py-4 mt-12 w-full">
                  {notes.slice(0, 5).map((post: any, i: number) => {
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
            </div>
          </div>
        </div>
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
