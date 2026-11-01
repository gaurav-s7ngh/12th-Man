import React from "react";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  eyebrow,
  description,
  subtitle,
  actions,
  children,
}) => {
  const effectiveDesc = description || subtitle;

  return (
    <div className="border-b border-[#1D3025] pb-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {eyebrow && (
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#10B981] mb-1">
              {eyebrow}
            </div>
          )}
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#E8EDE9] font-mono uppercase">
            {title}
          </h1>
          {effectiveDesc && (
            <p className="text-xs text-[#87958B] mt-1 max-w-3xl leading-relaxed">
              {effectiveDesc}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};
