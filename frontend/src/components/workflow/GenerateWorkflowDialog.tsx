import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Bot,
  Zap,
  LayoutGrid,
} from "lucide-react";
import type { Workflow } from "./WorkflowCard";
import { axiosInstance } from "@/utils";
import type { Edge } from "@xyflow/react";

interface GeneratedWorkflow {
  nodes: Node[];
  edges: Edge[];
  agentsUsed: string[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    nodeTypes: Record<string, number>;
  };
}

const SUGGESTED_PROMPTS = [
  {
    title: "Email Automation",
    prompt:
      "Generate a workflow that reads emails, checks if urgent, then sends a reply",
    icon: "📧",
  },
  {
    title: "Data Processing",
    prompt: "Read data from sheets, process it, and send summary via email",
    icon: "📊",
  },
  {
    title: "Email to Sheets",
    prompt: "Read emails and write the important data to Google Sheets",
    icon: "📝",
  },
  {
    title: "Auto Responder",
    prompt: "Monitor gmail inbox and automatically send acknowledgment emails",
    icon: "⚡",
  },
  {
    title: "Sheet Updates",
    prompt: "Read Gmail and update sheet with email statistics",
    icon: "📈",
  },
  {
    title: "Spam Handler",
    prompt: "Delete spam emails and log them to a tracking sheet",
    icon: "🗑️",
  },
];

export function GenerateWorkflowDialog({
  open,
  setOpen,
  onCreated,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCreated: (wf: Workflow) => void;
}) {
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedWorkflow, setGeneratedWorkflow] =
    useState<GeneratedWorkflow | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setGeneratedWorkflow(null);

    if (!prompt.trim()) {
      setError("Please enter a prompt describing your workflow");
      return;
    }

    try {
      setLoading(true);

      const { data } = await axiosInstance.post("/others/generate-workflow", {
        prompt: prompt.trim(),
      });

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to generate workflow");
      }

      const workflow: GeneratedWorkflow = data.data;
      setGeneratedWorkflow(workflow);

      onCreated({
        edges: workflow.edges,
        nodes: workflow.nodes,
      });
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to generate workflow. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = (promptText: string) => {
    setPrompt(promptText);
  };

  const handleClose = () => {
    setOpen(false);
    setPrompt("");
    setError(null);
    setGeneratedWorkflow(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Generate Workflow with AI
              </DialogTitle>
              <DialogDescription>
                Describe your workflow in natural language
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Prompt Input */}
            {!loading && !generatedWorkflow && (
              <div className="space-y-3">
                <Label
                  htmlFor="workflow-prompt"
                  className="text-base font-medium flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  What do you want to automate?
                </Label>
                <Textarea
                  id="workflow-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Example: Generate a workflow that reads emails, checks if urgent, then sends a reply"
                  className="min-h-[120px] resize-none text-base border-2 focus:border-primary transition-colors"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about what you want to automate for best results
                </p>
              </div>
            )}

            {/* Suggested Prompts */}
            {!generatedWorkflow && !loading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <Label className="text-sm font-medium">
                    Try these examples
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {SUGGESTED_PROMPTS.map((suggestion, idx) => (
                    <Card
                      key={idx}
                      className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group relative overflow-hidden"
                      onClick={() => handleCopyPrompt(suggestion.prompt)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardContent className="p-4 relative">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform">
                            {suggestion.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold mb-1.5 group-hover:text-primary transition-colors">
                              {suggestion.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {suggestion.prompt}
                            </p>
                          </div>
                          <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                {/* User Prompt Display */}
                <Card className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">You</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm leading-relaxed">{prompt}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Processing */}
                <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4 text-center">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                          <Bot className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <Loader2 className="h-20 w-20 absolute -top-2 -left-2 text-primary animate-spin" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-lg">
                          Generating your workflow...
                        </p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          AI is analyzing your requirements and creating the
                          perfect workflow structure
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-center">
                        <Badge variant="secondary" className="animate-pulse">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Analyzing prompt
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="animate-pulse"
                          style={{ animationDelay: "150ms" }}
                        >
                          <LayoutGrid className="h-3 w-3 mr-1" />
                          Creating nodes
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="animate-pulse"
                          style={{ animationDelay: "300ms" }}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Connecting flow
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="space-y-4">
                {/* User Prompt Display */}
                <Card className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">You</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm leading-relaxed">{prompt}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Error Card */}
                <Card className="border-2 border-destructive">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-destructive mb-1">
                          Generation Failed
                        </p>
                        <p className="text-sm text-muted-foreground">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Success State */}
            {generatedWorkflow && !loading && (
              <div className="space-y-4">
                {/* User Prompt Display */}
                <Card className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">You</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm leading-relaxed">{prompt}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Response */}
                <Card className="border-2 border-primary/50">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg mb-1">
                            Workflow Generated Successfully!
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Your AI-powered workflow is ready to use
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Metadata */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Workflow Summary
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                          <Card className="border-2">
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold text-primary mb-1">
                                {generatedWorkflow.metadata.totalNodes}
                              </p>
                              <p className="text-xs text-muted-foreground font-medium">
                                Total Nodes
                              </p>
                            </CardContent>
                          </Card>
                          <Card className="border-2">
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold text-primary mb-1">
                                {generatedWorkflow.metadata.totalEdges}
                              </p>
                              <p className="text-xs text-muted-foreground font-medium">
                                Connections
                              </p>
                            </CardContent>
                          </Card>
                          <Card className="border-2">
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold text-primary mb-1">
                                {generatedWorkflow.agentsUsed.length}
                              </p>
                              <p className="text-xs text-muted-foreground font-medium">
                                Agents
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Agents Used */}
                      {generatedWorkflow.agentsUsed.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Agents Used
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {generatedWorkflow.agentsUsed.map((agent, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                <Bot className="h-3 w-3 mr-1" />
                                {agent}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Node Types */}
                      {Object.keys(generatedWorkflow.metadata.nodeTypes)
                        .length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Node Types
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(
                              generatedWorkflow.metadata.nodeTypes
                            ).map(([type, count]) => (
                              <Badge
                                key={type}
                                variant="outline"
                                className="text-xs"
                              >
                                {type}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {generatedWorkflow ? "Close" : "Cancel"}
          </Button>

          {!generatedWorkflow && (
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Workflow
                </>
              )}
            </Button>
          )}

          {generatedWorkflow && (
            <Button onClick={handleClose} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Use This Workflow
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
