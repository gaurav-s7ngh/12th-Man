import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-lg border border-dashed border-[#1D3025] bg-[#080F0B] font-mono">
      <div className="p-3 rounded-full bg-[#0D1C15] border border-[#1D3025] text-[#87958B] mb-3">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#E8EDE9] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-[11px] text-[#87958B] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
