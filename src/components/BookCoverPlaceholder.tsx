const PALETTES = [
  "from-slate-500 to-slate-700",
  "from-stone-500 to-stone-700",
  "from-amber-600 to-amber-800",
  "from-emerald-600 to-emerald-800",
  "from-teal-600 to-teal-800",
  "from-blue-600 to-blue-800",
  "from-indigo-600 to-indigo-800",
  "from-violet-600 to-violet-800",
  "from-rose-600 to-rose-800",
];

function hashTitle(title: string): number {
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h;
}

interface Props {
  title: string;
  author?: string | null;
  className?: string;
}

export default function BookCoverPlaceholder({ title, author, className = "" }: Props) {
  const palette = PALETTES[hashTitle(title) % PALETTES.length];
  return (
    <div className={`bg-gradient-to-b ${palette} flex flex-col items-center justify-center p-3 text-center ${className}`}>
      <p className="text-white text-xs font-medium leading-tight line-clamp-4 mb-1.5">{title}</p>
      {author && (
        <p className="text-white/60 text-[10px] leading-tight line-clamp-2">{author}</p>
      )}
    </div>
  );
}
