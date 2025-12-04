import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "../ui/textarea";
import type { Workflow } from "./WorkflowCard";
import { axiosInstance } from "@/utils";

export function CreateWorkflowDialog({
  open,
  setOpen,
  onCreated,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCreated: (wf: Workflow) => void;
}) {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Updated to accept MouseEvent since we are clicking a button
  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Title is required");

    try {
      setLoading(true);
      const { data } = await axiosInstance.post("/workflow", {
        title,
        description,
      });

      const created: Workflow = data?.data?.workflow || data?.data || data;
      onCreated(created);
      setOpen(false);
      setTitle("");
      setDescription("");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create workflow"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
          <DialogDescription>
            Define a title and short description for your workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="wf-title">Title</Label>
            <Input
              id="wf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              // Optional: Allow "Enter" key to submit inside the input
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wf-desc">Description</Label>
            <Textarea
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <div className="text-destructive text-sm">{error}</div>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          {/* CORRECTED BUTTON */}
          <Button
            type="button"
            onClick={handleSubmit} // Directly reference the function
            disabled={loading}
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
