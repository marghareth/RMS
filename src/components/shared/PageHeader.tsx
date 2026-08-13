interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold leading-tight tracking-tight text-[#1B2430]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-4 h-px bg-[#1B2430]" />
      <div className="mt-0.75 h-px bg-[#E9EAEC]" />
    </div>
  );
}