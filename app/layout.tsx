function Header() {
  return (
    <header>
      <a href="/">James Long</a>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <div>
        Looking for old articles? See{' '}
        <a href="//archive.jlongster.com">archive.jlongster.com</a>
      </div>

      <div>
        <a href="https://twitter.com/jlongster">@jlongster</a>
      </div>
    </footer>
  );
}

export function Layout({ name, children, className, sidebar }) {
  return (
    <div className="site-content">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
