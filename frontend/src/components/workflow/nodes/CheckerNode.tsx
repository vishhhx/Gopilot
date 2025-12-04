import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

const CheckerNode = memo(() => {
  const Executing = false;

  return (
    <div className="relative">
      {/* Diamond-shaped card using clip-path instead of rotation */}
      <Card
        className="relative w-40 h-40 border border-orange-500/30 dark:border-orange-500/30 bg-white dark:bg-slate-900 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-visible"
        style={{
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        }}
      >
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-orange-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />

        {/* Content container - no counter-rotation needed */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Executing ? (
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <CheckCircle className="w-10 h-10 text-orange-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Checker
              </span>
            </div>
          )}
        </div>

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-orange-500/5 dark:bg-orange-500/10" />
      </Card>

      {/* Input Handle - Top (from previous node) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: "24px",
          height: "24px",
          top: "-12px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#f97316",
          border: "4px solid #ffffff",
          borderRadius: "50%",
          boxShadow: "0 4px 12px rgba(249, 115, 22, 0.5)",
          zIndex: 10,
        }}
        className="hover:scale-125 transition-transform duration-200"
      />

      {/* Output Handle - Bottom (to next node) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{
          width: "24px",
          height: "24px",
          bottom: "-12px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#10b981",
          border: "4px solid #ffffff",
          borderRadius: "50%",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.5)",
          zIndex: 10,
        }}
        className="hover:scale-125 transition-transform duration-200"
      />

      {/* Handle labels */}
      {Executing && (
        <>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Input
            </span>
          </div>

          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Output
            </span>
          </div>
        </>
      )}
    </div>
  );
});

CheckerNode.displayName = "CheckerNode";

export default CheckerNode;
