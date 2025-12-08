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
  showSidebarInMobile,
}) {
  const location = useLocation();
  return (
    <div className={className}>
      <div className="mx-[80px] max-[950px]:mx-[25px]">
        <nav className="uncolored-links flex gap-4 mt-4 mb-[130px] max-w-[750px]">
          <div className={`${location.pathname === '/' ? 'matches' : ''}`}>
            <a href="/">Home</a>
          </div>
          |
          <div className={`${location.pathname === '/work' ? 'matches' : ''}`}>
            <a href="/work">Work</a>
          </div>
          |
          <div className={`${location.pathname === '/about' ? 'matches' : ''}`}>
            <a href="/about">About</a>
          </div>
          |
          <div>
            <a href="https://x.com/jlongster" target="_blank">
              @jlongster
            </a>
          </div>
        </nav>

        <div className="flex justify-between max-w-[1200px] max-[950px]:flex-col-reverse">
          <main
            className={
              'overflow-hidden page-content flex-1 max-w-[750px] ' +
              contentClassName
            }
          >
            {children}
          </main>

          <div
            className={
              `w-[300px] ml-[60px] mb-[100px] max-[950px]:ml-0 max-[950px]:w-auto ` +
              (showSidebarInMobile ? '' : 'block max-[950px]:hidden')
            }
          >
            {sidebar}
          </div>
        </div>
      </div>

      {footer || <Footer />}
    </div>
  );
}

export function Footer({ children, className }) {
  return (
    <footer
      className={`mx-[80px] max-[950px]:mx-[25px] mt-[200px] mb-[170px] max-w-[750px] text-[15px] text-subdued ${className}`}
    >
      {children}
    </footer>
  );
}

export function BareFooter({ children, className }) {
  return <footer className={`text-subdued ${className}`}>{children}</footer>;
}
