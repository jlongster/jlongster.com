import * as queries from './db/queries';
import { formatDate, PageList } from './page';
import { TableOfContents } from './blocks';
import { XIcon } from './icons/x';
import { HomeIcon } from './icons/home';
import { PostsIcon } from './icons/posts';
import { SineIcon } from './icons/sine';
import { useLocation } from '@remix-run/react';

function SectionTitle({ children }) {
  return (
    <div className="text-[length:13px] mb-0 mt-[30px] text-[#818a90] font-semibold">
      {children}
    </div>
  );
}

export function Layout({
  name,
  className,
  contentClassName = '',
  children,
  toc,
  page,
  minimal,
  footer,
}) {
  const location = useLocation();
  return (
    <div className={className}>
      <div className="flex flex-col items-center text-inherit">
        <nav className="absolute uncolored-links flex flex-row gap-5 self-center text-sm [&_svg]:w-[18px] [&_svg]:mr-2 [&_.item]:my-2 [&_.item]:px-2 [&_.item]:py-1 [&_.matches]:bg-primary [&_.matches]:text-bg [&_.matches]:rounded-full [&_a_.title]:flex [&_a_.title]:items-center">
          <div className={`item ${location.pathname === '/' ? 'matches' : ''}`}>
            <a href="/">
              <div className="title">
                <HomeIcon /> Home
              </div>
            </a>
          </div>
          <div
            className={`item ${
              location.pathname === '/posts' ? 'matches' : ''
            }`}
          >
            <a href="/posts">
              <div className="title">
                <PostsIcon /> Posts
              </div>
            </a>
          </div>
          <div
            className={`item ${
              location.pathname === '/experiments' ? 'matches' : ''
            }`}
          >
            <a href="/experiments">
              <div className="title">
                <SineIcon /> Experiments
              </div>
            </a>
          </div>
          <div className="item">
            <a href="https://x.com/jlongster">
              <div className="title">
                <XIcon className="!mr-[6px]" /> @jlongster
              </div>
            </a>
          </div>
        </nav>
      </div>

      <div className="flex">
        <div
          className={
            'flex-1 flex justify-center ' +
            (minimal
              ? ''
              : 'justify-center max-[950px]:mt-5 max-[950px]:ml-0 max-[950px]:flex-col max-[950px]:px-[30px]')
          }
        >
          <main
            className={
              (minimal
                ? ''
                : 'mt-[130px] overflow-hidden w-[750px] max-[950px]:pl-0 max-[950px]:pr-0 max-[950px]:w-auto max-[950px]:max-w-full') +
              ' ' +
              contentClassName
            }
          >
            {children}
          </main>
        </div>

        {toc ? (
          <div className="min-[951px]:fixed min-[951px]:overflow-auto min-[951px]:max-h-[calc(100dvh-40px)] min-[951px]:w-[300px] min-[951px]:p-5 min-[951px]:flex-basis-auto min-[951px]:flex min-[951px]:flex-col min-[951px]:m-5 max-[950px]:fixed max-[950px]:flex-row max-[950px]:w-full max-[950px]:px-5 max-[950px]:gap-5 max-[950px]:border-b max-[950px]:border-[#e8e9ea] max-[950px]:bg-white [&_a]:text-inherit">
            <div className="max-[950px]:hidden">
              <SectionTitle>Table of contents</SectionTitle>
              <div className="mt-3 leading-[1.35em] text-[length:15px]">
                <TableOfContents toc={toc} pageid={page.url} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {footer || <Footer />}
    </div>
  );
}

export function Footer({ children, className }) {
  return (
    <footer
      className={`mx-auto mb-[170px] w-[600px] text-[15px] text-subdued ${className}`}
    >
      {children}

      <a
        className="block w-5 mx-auto mt-[150px] uncolored-link"
        href="https://twitter.com/jlongster"
      >
        <XIcon />
      </a>
    </footer>
  );
}

export function BareFooter({ children, className }) {
  return <footer className={`text-subdued ${className}`}>{children}</footer>;
}
