import * as queries from './db/queries';
import { formatDate, PageList } from './page';
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
  sidebar,
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
            'flex-1 ' +
              (!toc ? 'flex justify-center ' : 'ml-[80px] ') +
            (minimal
              ? ''
              : ' max-[950px]:mt-5 max-[950px]:flex-col max-[950px]:px-[30px] ')
          }
        >
          <main
            className={
              'page-content ' +
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

        {sidebar}
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
