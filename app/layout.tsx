import { formatDate, PageList } from './page';
import { TableOfContents } from './blocks';
import { XIcon } from './icons/x';
import { HomeIcon } from './icons/home';
import { PostsIcon } from './icons/posts';

function SectionTitle({ children }) {
  return <div className="page-list-section">{children}</div>;
}

export function Layout({ name, children, toc, page, recentPosts }) {
  return (
    <div className="site-content">
      <div className="site-content-left">
        <div className="page-list">
          <a href="/" className="page-list-item">
            <div className="title">
              <HomeIcon /> Home
            </div>
          </a>
          <a href="/posts" className="page-list-item">
            <div className="title">
              <PostsIcon /> Posts
            </div>
          </a>
          <a href="https://x.com/jlongster" className="page-list-item">
            <div className="title">
              <XIcon /> @jlongster
            </div>
          </a>
        </div>

        {toc ? (
          <div className="toc-section">
            <SectionTitle>Table of contents</SectionTitle>
            <div className="toc">
              <TableOfContents toc={toc} pageid={page.url} />
            </div>
          </div>
        ) : null}

        <div className="recent-posts-section">
          <SectionTitle>Recent posts</SectionTitle>
          <PageList pages={recentPosts} />
        </div>
      </div>

      <div className="site-content-main">
        <main className={`page-content ${name}`}>{children}</main>
      </div>
    </div>
  );
}
