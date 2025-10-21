export function AlignedList({ items, className }) {
  return (
    <div className={`flex flex-col gap-[1em] md:gap-[length:.4em] ${className}`}>
      {items.map(item => {
        return (
          <a href={'/' + item.url} className="nounderline group flex flex-col md:flex-row md:items-center md:gap-[30px] text-inherit">
            <div className="title group-hover:underline">{item.title}</div>
            <div className="hidden md:block flex-1 h-px bg-[length:8px_1px] bg-repeat-x bg-[position:0_0] [background-image:linear-gradient(to_right,#303030_1px,transparent_1px)]"></div>
            <div className="text-[0.9em] text-[#a0a0a0] whitespace-nowrap">{item.description}</div>
          </a>
        );
      })}
    </div>
  );
}
