import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = "Failed to load data",
  message,
  onRetry,
}) => {
  return (
    <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-6 text-center my-6">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
      <h3 className="text-sm font-semibold text-red-200 uppercase tracking-wide font-mono">{title}</h3>
      <p className="text-xs text-red-400 mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-200 bg-red-900/50 hover:bg-red-800/60 rounded border border-red-700/50 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
};
