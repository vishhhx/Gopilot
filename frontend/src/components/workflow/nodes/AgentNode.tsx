import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";

interface AgentNodeProps {
  data: {
    service: string;
    id: string;
    name: string;
    description: string;
    svgpath: string;
  };
}

const AgentNode = memo(({ data }: AgentNodeProps) => {
  return (
    <Card className="relative w-56 border border-orange-500/30 dark:border-orange-500/30 bg-white dark:bg-slate-900 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-orange-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-4">
        <div className="flex items-center gap-3">
          {/* Service Logo */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-md border border-slate-200 dark:border-slate-700">
              <img 
                src={`http://localhost:5000${data.svgpath}`} 
                alt={data.service}
                className="w-6 h-6"
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-base font-bold text-orange-600 dark:text-orange-400 mb-0.5">
              {data.name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {data.description}
            </p>
          </div>
        </div>
      </div>

      {/* Input Handle - Left Side */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ 
          width: '24px',
          height: '24px',
          left: '-12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#f97316',
          border: '4px solid #ffffff',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(249, 115, 22, 0.5)',
          zIndex: 10
        }}
        className="hover:scale-125 transition-transform duration-200"
      />

      {/* Output Handle - Right Side */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ 
          width: '24px',
          height: '24px',
          right: '-12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#f97316',
          border: '4px solid #ffffff',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(249, 115, 22, 0.5)',
          zIndex: 10
        }}
        className="hover:scale-125 transition-transform duration-200"
      />

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 dark:bg-orange-500/10 rounded-bl-3xl" />
    </Card>
  );
});

AgentNode.displayName = "AgentNode";

export default AgentNode;