import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="rounded-lg bg-[#0D1C15] border border-[#EF4444]/30 p-5 font-mono text-center max-w-lg mx-auto my-8">
      <div className="flex items-center justify-center gap-2 text-[#EF4444] mb-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Telemetric Exception</span>
      </div>
      <p className="text-xs text-[#87958B] leading-relaxed mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded bg-[#12251B] hover:bg-[#1D3025] text-[#E8EDE9] text-xs font-mono border border-[#1D3025] transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
};
