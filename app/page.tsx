import { format as dfnsFormat, addHours } from 'date-fns';

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

export function EnhancedPageList({ pages }) {
  return (
    <div className="enhanced-page-list">
      {pages.map(page => {
        const imgUrl = page['featured-image'];

        return (
          <a
            key={page.uuid}
            href={`/${page.url}`}
            className="enhanced-list-item"
          >
            <div className="enhanced-list-content">
              <div className="enhanced-list-title">{page.title}</div>
              {page.subtitle && (
                <div className="enhanced-list-subtitle">{page.subtitle}</div>
              )}
              <div className="enhanced-list-date">{formatDate(page.date)}</div>
            </div>
            {imgUrl && (
              <div className="enhanced-list-image">
                <img src={imgUrl} alt="" />
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

export function formatDate(date) {
  return dfnsFormat(
    // Adding 12 hours is a quick fix for timezone issues; we want to
    // display the same exact day everywhere and this accounts for
    // almost (all?) timezone offsets. Without this, `format` may
    // show the day before because it takes timezones into account
    addHours(typeof date === 'string' ? new Date(date) : date, 12),
    'MMM do, yyyy',
  );
}
