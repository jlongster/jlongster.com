export function PageList({ pages }) {
  return (
    <ul>
      {pages.map(page => (
        <li key={page.id}>
          <a href={`/${page.properties.url}`}>{page.name}</a> (
          {page.properties.date})
        </li>
      ))}
    </ul>
  );
}
