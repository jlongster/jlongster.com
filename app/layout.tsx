function Header() {
  return (
    <header>
      <a href="/">
        <img src="/logo.png" width="50" />
      </a>
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

export function Layout({ name, children }) {
  return (
    <div className={'site-content ' + (name || '')}>
      <Header />
      {children}
      <Footer />
    </div>
  );
}
