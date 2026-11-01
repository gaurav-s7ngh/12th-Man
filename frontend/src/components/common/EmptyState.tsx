import React from "react";
import { FolderSearch } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No records found",
  description = "No matching records were found for the current criteria.",
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 rounded-lg p-6 bg-zinc-950/40">
      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
        <FolderSearch className="w-5 h-5 text-zinc-500" />
      </div>
      <h3 className="text-sm font-medium text-zinc-300 font-mono">{title}</h3>
      <p className="text-xs text-zinc-500 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
