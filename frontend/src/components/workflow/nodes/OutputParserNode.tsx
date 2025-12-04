import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";

const OutputParserNode = memo(
  ({ data }: { data: { message?: string; isExecuting?: boolean } }) => {
    return (
      <Card className="relative w-56 border border-purple-500/30 dark:border-purple-500/30 bg-white dark:bg-slate-900 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
        <div className="absolute inset-0 bg-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />

        <div className="relative p-4">
          {data.isExecuting ? (
            <div className="flex flex-col items-center justify-center py-2">
              <svg
                className="w-8 h-8 text-purple-500 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Parsing output...
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950 rounded-xl flex items-center justify-center shadow-md border border-purple-200 dark:border-purple-800">
                  <svg
                    className="w-6 h-6 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-base font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                  Output Parser
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {data.message || "Parses and formats output data"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input Handle - Left Side */}
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: "24px",
            height: "24px",
            left: "-12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#a855f7",
            border: "4px solid #ffffff",
            borderRadius: "50%",
            boxShadow: "0 4px 12px rgba(168, 85, 247, 0.5)",
            zIndex: 10,
          }}
          className="hover:scale-125 transition-transform duration-200"
        />

        {/* Output Handle - Right Side */}
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: "24px",
            height: "24px",
            right: "-12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#a855f7",
            border: "4px solid #ffffff",
            borderRadius: "50%",
            boxShadow: "0 4px 12px rgba(168, 85, 247, 0.5)",
            zIndex: 10,
          }}
          className="hover:scale-125 transition-transform duration-200"
        />

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 dark:bg-purple-500/10 rounded-bl-3xl" />
      </Card>
    );
  }
);
export default OutputParserNode;
