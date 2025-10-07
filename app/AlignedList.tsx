export function AlignedList({ items, className }) {
  return (
    <div className={'aligned-list ' + className}>
      {items.map(item => {
        return (
          <a href={'/' + item.url}>
            <div className="title">{item.title}</div>
            <div className="line"></div>
            <div className="description">{item.description}</div>
          </a>
        );
      })}
    </div>
  );
}
