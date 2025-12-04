import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ErrorHandlerNodeProps {
  data: {
    message?: string;
    isError?: boolean;
    error?: string;
  };
}

// Error Handler Node Component
const ErrorHandlerNode = memo(({ data }: ErrorHandlerNodeProps) => {
  return (
    <Card className="relative w-56 border border-red-500/30 dark:border-red-500/30 bg-white dark:bg-slate-900 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
      <div className="absolute inset-0 bg-red-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-950 rounded-xl flex items-center justify-center shadow-md border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400 mb-0.5">
              Error Handler
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {data?.message || "Handles and processes errors"}
            </p>
          </div>
        </div>

        {/* Show error details if isError is true and error message exists */}
        {data?.isError && data?.error && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-300 font-mono break-words">
              {data?.error}
            </p>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: "24px",
          height: "24px",
          left: "-12px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "#ef4444",
          border: "4px solid #ffffff",
          borderRadius: "50%",
          boxShadow: "0 4px 12px rgba(239, 68, 68, 0.5)",
          zIndex: 10,
        }}
        className="hover:scale-125 transition-transform duration-200"
      />

      <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 dark:bg-red-500/10 rounded-bl-3xl" />
    </Card>
  );
});

ErrorHandlerNode.displayName = "ErrorHandlerNode";
export default ErrorHandlerNode;
