import { WorkflowIcon, ArrowRight, Copy, MoreHorizontal } from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
export type Workflow = {
  _id: string;
  title?: string;
  description?: string;
  updatedAt?: string;
};
export function WorkflowCard({ wf }: { wf: Workflow }) {
  const updated =
    wf.updatedAt && !Number.isNaN(new Date(wf.updatedAt).valueOf())
      ? new Date(wf.updatedAt).toLocaleString()
      : "-";

    const navigate=useNavigate()
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.01] border border-slate-200/80 dark:border-slate-700/60 rounded-xl">
      <div
        className="
          absolute top-0 right-0 w-24 h-24 
          bg-emerald-100/60 dark:bg-emerald-500/15 
          rounded-bl-3xl 
          pointer-events-none
        "
      />

      <CardHeader className="flex items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-4">
          <div
            className="
              rounded-lg p-3 shadow-sm
              bg-emerald-100 dark:bg-emerald-600/20
              border border-emerald-200 dark:border-emerald-700/50
            "
          >
            <WorkflowIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* Title + Desc */}
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {wf.title || "Untitled Workflow"}
            </CardTitle>

            <CardDescription className="text-sm text-muted-foreground line-clamp-2 max-w-[240px]">
              {wf.description || "No description provided"}
            </CardDescription>

            <div
              className="
                mt-2 text-xs 
                text-emerald-700/70 
                dark:text-emerald-300/80
              "
            >
              Updated: {updated}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="px-2 py-1">
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="px-2 py-1">
              <Copy className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="px-2 py-1">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground line-clamp-2 max-w-[240px]">
            {wf.description || "No description"}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-green-800 cursor-pointer" onClick={()=>navigate(`/workflow/${wf._id}`)}>
              Open
            </Button>

          </div>
        </div>
      </CardContent>
    </Card>
  );
}
