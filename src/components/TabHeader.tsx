interface TabHeaderProps {
  title: string;
  subtitle: string;
}

export default function TabHeader({ title, subtitle }: TabHeaderProps) {
  return (
    <div className="tab-header pb-6">
      <h1 className="page-title text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="page-subtitle max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}
