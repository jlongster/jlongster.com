import { format as dfnsFormat, addHours } from 'date-fns';

export function PageList({ pages, className }) {
  return (
    <div className={'page-list ' + className}>
      {pages.map(page => (
        <a href={'/' + page.url} className="page-list-item">
          <div className="title">{page.title}</div>
          <div className="date">{formatDate(page.date)}</div>
        </a>
      ))}
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
    'MMMM do, yyyy',
  );
}
