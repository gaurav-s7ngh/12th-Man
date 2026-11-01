import React from "react";

interface SectionHeaderProps {
  title: string;
  count?: number | string;
  subtitle?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  subtitle,
  actions,
  action,
}) => {
  const effectiveActions = actions || action;

  return (
    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1D3025]">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#E8EDE9]">
            {title}
          </h2>
          {count !== undefined && (
            <span className="rounded bg-[#12251B] border border-[#1D3025] px-1.5 py-0.2 text-[10px] font-mono font-semibold text-[#10B981]">
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] font-mono text-[#87958B] mt-0.5">{subtitle}</p>
        )}
      </div>
      {effectiveActions && <div className="flex items-center gap-2">{effectiveActions}</div>}
    </div>
  );
};
