import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Square } from "lucide-react";

const EndNode = memo(() => {
  return (
    <Card className="relative w-56 border border-rose-500/30 dark:border-rose-500/30 bg-white dark:bg-slate-900 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-rose-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-md">
              <Square className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 mb-0.5">
              End
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Finish workflow
            </p>
          </div>
        </div>
      </div>

      {/* Big Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: "20px",
          height: "20px",
          left: "-10px",
          background: "#e11d48",
          border: "3px solid white",
          borderRadius: "50%",
        }}
        className="dark:border-slate-900 shadow-lg hover:scale-110 transition-transform duration-200"
      />

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 dark:bg-rose-500/10 rounded-bl-3xl" />
    </Card>
  );
});

EndNode.displayName = "EndNode";

export default EndNode;
