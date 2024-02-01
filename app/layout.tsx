function Header() {
  return (
    <header>
      <a href="/">
        <img src="/logo.png" width="50" />
      </a>
      <button id="color-picker">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          width="16"
          height="16"
          fill="none"
        >
          <path
            fill="currentColor"
            d="M37.65 40H56a8 8 0 0 0 8-8 32 32 0 1 0-32 32h2.34a9.66 9.66 0 0 0 6.83-16.48l-4.69-4.69A1.66 1.66 0 0 1 37.65 40Zm-6.83 8.48 4.69 4.69A1.66 1.66 0 0 1 34.34 56H32a24 24 0 1 1 0-48 23.73 23.73 0 0 1 16 6.12A24 24 0 0 1 56 32H37.65a9.66 9.66 0 0 0-6.83 16.48Z"
          />
          <path
            fill="currentColor"
            d="M40 24a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM24 24a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 40a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          />
        </svg>
      </button>
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
