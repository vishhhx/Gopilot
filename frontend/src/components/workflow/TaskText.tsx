import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { chipClass, displayValue, type InputField } from "@/lib/workflow";

const TOKEN = /\{\{\s*([\w-]+)\s*\}\}/g;

/** One input inside a task, shown by its name (or its value once filled in), never as {{key}}. */
export function InputChip({ label, value, missing, className }: { label: string; value?: string; missing?: boolean; className?: string }) {
  return (
    <span
      contentEditable={false}
      title={value ? label : missing ? "This input no longer exists. Pick another one." : "Filled in when the workflow runs"}
      className={cn(chipClass(missing ? "missing" : value ? "value" : "input"), className)}
    >
      {!value && !missing && <span aria-hidden className="size-1.5 rounded-full bg-current opacity-60" />}
      <span className="truncate">{value || label}</span>
    </span>
  );
}

/** A step's task with its inputs drawn as chips. With `values`, filled-in inputs show their value. */
export function TaskText({
  text,
  inputs,
  values,
  className,
}: {
  text: string;
  inputs: InputField[];
  values?: Record<string, string>;
  className?: string;
}) {
  const parts = text.split(TOKEN);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const field = inputs.find((f) => f.key === part);
        return (
          <InputChip
            key={i}
            label={field?.label ?? part.replace(/_/g, " ")}
            value={displayValue(values?.[part]?.trim()) || undefined}
            missing={!field}
          />
        );
      })}
    </span>
  );
}
