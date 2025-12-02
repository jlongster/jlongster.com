import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';

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
      <script src="/paper-devtools.js" />
      <script src="/text-devtools.js" />
      <script src="/shadow-renderer.js" />
      <script src="/paper-animator.js?v=7" />
      <script src="/paper-renderer.js?v=3" />
      <script src="/paper-animation-editor.js" />
      <script src="/arrow-animator.js" />
      <script src="/animation-coordinator.js" />
      <script src="/anim-devtools.js" />

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
                  top: 200,
                  left: -456,
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
                I wrote a note for you, open it!
              </CanvasText>
            </section>
          </div>
        </div>

        <div
          style={{
            marginTop: 200,
            marginBottom: 300,
            minHeight: '100vh',
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
              { group: 'experiments', delay: 0, trigger: 'load' },
              { group: 'experiments', delay: 600, trigger: 'load' },
              { group: 'experiments', delay: 400, trigger: 'load' },
              { group: 'experiments', delay: 200, trigger: 'load' },
            ]}
          />
          <CanvasText
            position={{
              top: 295,
              left: 973,
            }}
            arrow={{
              name: 'down-left',
              top: 257,
              left: 959,
              scale: 0.4,
            }}
            color="rgb(249, 141, 47)"
            rotation={8}
            anim={{
              group: 'experiments',
              textDelay: 1500,
              arrowDelay: 1800,
              trigger: 'load',
            }}
          >
            Some experiments I've worked on
          </CanvasText>
        </div>

        {/* Semantic list of all posts - will be scraped by JS
            NEVER apply display: none here, it should always be an inline script tag below*/}
        <PostsList
          posts={notes}
          id="all-posts"
          style={{ marginTop: 200, marginBottom: 300, minHeight: '100vh' }}
          animationConfigs={[
            {
              animationName: 'floating',
              offsetX: 573,
              offsetY: 199,
              rotation: -43,
              scale: 1,
              startKeyframe: 31,
              endKeyframe: 59,
            },
            {
              animationName: 'slide-in',
              offsetX: 1045,
              offsetY: 51,
              rotation: -16,
              scale: 1.2,
              startKeyframe: 5,
              endKeyframe: 59,
            },
            {
              animationName: 'floating',
              offsetX: 564,
              offsetY: 493,
              rotation: -9,
              scale: 0.9,
              startKeyframe: 28,
              endKeyframe: 59,
            },
            {
              animationName: 'slide-in',
              offsetX: 962,
              offsetY: 408,
              rotation: -34,
              scale: 1.1,
              startKeyframe: 0,
              endKeyframe: 59,
            },
          ]}
        />
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
