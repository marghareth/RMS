// FILE: src/components/shared/PageHeader.tsx
import PageTutorial, { TutorialContent } from "@/components/shared/PageTutorial";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** When provided, shows a "How to use" button that opens this guide. */
  tutorial?: TutorialContent;
}

export default function PageHeader({ title, subtitle, actions, tutorial }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-bold text-[#1F2937] dark:text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3] mt-0.5">{subtitle}</p>}
      </div>
      {(actions || tutorial) && (
        <div className="flex items-center gap-2">
          {tutorial && <PageTutorial tutorial={tutorial} />}
          {actions}
        </div>
      )}
    </div>
  );
}