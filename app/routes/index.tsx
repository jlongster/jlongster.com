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
      <div>
        Hi.
      </div>
    </>
  );
}
