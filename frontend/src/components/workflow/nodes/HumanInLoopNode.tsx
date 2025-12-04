import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";

const HumanInLoopNode = memo(() => {
  return (
    <Card className="relative w-56 border border-blue-500/30 dark:border-blue-500/30 bg-white dark:bg-slate-900 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center shadow-md border border-blue-200 dark:border-blue-800">
              <svg
                className="w-6 h-6 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold text-blue-600 dark:text-blue-400 mb-0.5">
              Human Review
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              Approve or Reject to continue
            </p>
          </div>
        </div>
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
          background: "#3b82f6",
          border: "4px solid #ffffff",
          borderRadius: "50%",
          boxShadow: "0 4px 12px rgba(59, 130, 246, 0.5)",
          zIndex: 10,
        }}
        className="hover:scale-125 transition-transform duration-200"
      />

      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-3xl" />
    </Card>
  );
});
HumanInLoopNode.displayName = "HumanInLoopNode";
export default HumanInLoopNode;
