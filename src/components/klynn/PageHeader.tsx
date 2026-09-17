interface Props {
  title: string;
  description?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}
export function PageHeader({ title, description, subtitle, children, className = "" }: Props) {
  const desc = description || subtitle;
  return (
    <div className={`mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${className}`}>
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">{title}</h1>
        {desc && <p className="mt-1 text-xs sm:text-sm text-muted-foreground md:text-base font-medium leading-relaxed">{desc}</p>}
      </div>
      {children && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 sm:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
