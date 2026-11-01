import React from "react";
import { cn } from "../../lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  description?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  p90Value?: string | number;
  highlight?: boolean;
  delta?: {
    value: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  description,
  change,
  trend,
  p90Value,
  highlight,
  delta,
  icon,
  className,
}) => {
  const effectiveSubtext = subtext || description;
  const effectiveDelta = delta || (change ? { value: change, positive: trend === "up" } : undefined);

  return (
    <div
      className={cn(
        "rounded bg-[#0D1C15] border border-[#1D3025] p-3 transition-colors",
        highlight && "border-[#10B981]/40 bg-[#12251B]",
        className
      )}
    >
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#87958B]">
        <span>{label}</span>
        {icon && <span className="text-[#10B981]">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2 mt-1.5">
        <span className="text-lg md:text-xl font-bold font-mono text-[#E8EDE9] tabular-nums tracking-tight">
          {value}
        </span>
        {p90Value !== undefined && (
          <span className="text-[11px] font-mono text-[#10B981] tabular-nums">
            {p90Value} <span className="text-[9px] text-[#87958B]">/90</span>
          </span>
        )}
      </div>

      {(effectiveSubtext || effectiveDelta) && (
        <div className="flex items-center justify-between text-[10px] font-mono text-[#87958B] mt-1 pt-1 border-t border-[#1D3025]/60">
          {effectiveSubtext && <span className="truncate">{effectiveSubtext}</span>}
          {effectiveDelta && (
            <span
              className={cn(
                "tabular-nums font-semibold",
                effectiveDelta.positive ? "text-[#10B981]" : "text-[#EF4444]"
              )}
            >
              {effectiveDelta.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
