import * as queries from './db/queries';
import { formatDate, PageList } from './page';
import { TableOfContents } from './blocks';
import { XIcon } from './icons/x';
import { HomeIcon } from './icons/home';
import { PostsIcon } from './icons/posts';
import { SineIcon } from './icons/sine';

function SectionTitle({ children }) {
  return <div className="page-list-section">{children}</div>;
}

export function Layout({ name, children, toc, page, footerContent }) {
  return (
    <>
      <div className="nav-wrapper">
        <nav>
          <a href="/">
            <div className="title">
              <HomeIcon /> Home
            </div>
          </a>
          <a href="/posts">
            <div className="title">
              <PostsIcon /> Posts
            </div>
          </a>
          <a href="/experiments">
            <div className="title">
              <SineIcon /> Experiments
            </div>
          </a>
          <a href="https://x.com/jlongster">
            <div className="title">
              <XIcon /> @jlongster
            </div>
          </a>
        </nav>
      </div>

      <div className="site-content">
        <div className="site-content-main">
          <main className={`page-content ${name}`}>{children}</main>
        </div>

        {toc ? (
          <div className="site-content-left">
            <div className="toc-section">
              <SectionTitle>Table of contents</SectionTitle>
              <div className="toc">
                <TableOfContents toc={toc} pageid={page.url} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Footer>{footerContent}</Footer>
    </>
  );
}

function Footer({ children }) {
  return (
    <footer>
      {children}

      <a className="x" href="https://twitter.com/jlongster">
        <XIcon />
      </a>
    </footer>
  );
}
