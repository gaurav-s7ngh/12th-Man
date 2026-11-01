import React from "react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Accessing football telemetry...",
  size = "md",
}) => {
  const sizeClass = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center font-mono">
      <div
        className={`${sizeClass} rounded-full border-[#1D3025] border-t-[#10B981] animate-spin mb-3`}
      />
      <p className="text-xs text-[#87958B] tracking-tight">{message}</p>
    </div>
  );
};
