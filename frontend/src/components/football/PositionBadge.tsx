import React from "react";
import { formatPosition, getPositionBadgeClass, cn } from "../../lib/utils";

interface PositionBadgeProps {
  position?: string | null;
  className?: string;
  showCategory?: boolean;
}

export const PositionBadge: React.FC<PositionBadgeProps> = ({
  position,
  className,
}) => {
  const displayPos = formatPosition(position);
  const isNotRecorded = displayPos === "Not recorded";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors whitespace-nowrap",
        getPositionBadgeClass(position),
        isNotRecorded && "opacity-80 italic",
        className
      )}
      title={isNotRecorded ? "Position not recorded in tournament lineup telemetry" : displayPos}
    >
      {displayPos}
    </span>
  );
};
