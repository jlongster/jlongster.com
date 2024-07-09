import { format as dfnsFormat } from 'date-fns';

export function PageList({ pages }) {
  return (
    <ul className="page-list">
      {pages.length === 0 ? (
        <li className="empty">No pages</li>
      ) : (
        pages.map(page => (
          <li key={page.url}>
            <a href={`/${page.url}`}>{page.title}</a>
          </li>
        ))
      )}
    </ul>
  );
}

export function formatDate(date) {
  return dfnsFormat(
    typeof date === 'string' ? new Date(date) : date,
    'MMM do, yyyy',
  );
}
