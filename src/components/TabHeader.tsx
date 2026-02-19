interface TabHeaderProps {
  title: string;
  subtitle: string;
}

export default function TabHeader({ title, subtitle }: TabHeaderProps) {
  return (
    <div className="sticky top-0 z-10 pt-4 md:pt-10 pb-4 bg-background">
      <h1 className="text-2xl font-bold tracking-tight mb-1">{title}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
