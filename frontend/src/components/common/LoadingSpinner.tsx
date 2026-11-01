import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading intelligence data...",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-emerald-500`} />
      {message && <p className="text-xs uppercase tracking-wider text-zinc-500 font-mono">{message}</p>}
    </div>
  );
};
