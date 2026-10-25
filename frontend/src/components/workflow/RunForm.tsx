import { GitFork, TriangleAlert, UserRoundCheck } from "lucide-react";
import { humanizeAgentName, resolveService, SERVICES } from "@/lib/services";
import { PICKER_TYPES, type InputField, type Plan } from "@/lib/workflow";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResourcePicker } from "./ResourcePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLogo } from "@/components/bloom/AppLogo";
import { TaskText } from "./TaskText";

const HTML_TYPE: Partial<Record<InputField["type"], string>> = {
  email: "email",
  number: "number",
  date: "date",
  time: "time",
  datetime: "datetime-local",
  url: "url",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The right control for one input: a picker, yes/no buttons, a choice list, or a typed field. */
function FieldControl({ id, field, value, onChange, autoFocus }: { id: string; field: InputField; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  if (PICKER_TYPES.has(field.type)) return <ResourcePicker id={id} type={field.type} value={value} onChange={onChange} />;
  if (field.type === "long_text") return <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3} autoFocus={autoFocus} />;
  if (field.type === "yes_no")
    return (
      <div id={id} role="radiogroup" className="inline-flex w-fit rounded-full bg-paper-2 p-1">
        {["yes", "no"].map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn("h-8 rounded-full px-4 text-[14px] capitalize transition-colors", value === v ? "bg-raised font-medium text-ink shadow-float" : "text-ink-soft hover:text-ink")}
          >
            {v}
          </button>
        ))}
      </div>
    );
  if (field.type === "select")
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 w-full">
          <SelectValue placeholder="Choose one" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  if (field.type === "email_list") {
    const emails = value.split(/[\s,;]+/).filter(Boolean);
    return (
      <div className="grid gap-1.5">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="ana@example.com, raj@example.com" autoFocus={autoFocus} />
        {emails.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {emails.map((e, i) => (
              <span key={i} className={cn("rounded-full px-2 py-0.5 text-[12px]", EMAIL.test(e) ? "bg-sage-wash text-sage-deep" : "bg-danger-wash text-danger")}>
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
  return <Input id={id} type={HTML_TYPE[field.type] ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} />;
}

/** The form for a workflow's inputs: one field per input, typed (email, date, link…). */
export function RunInputsForm({
  inputs,
  values,
  onChange,
  idPrefix = "run",
}: {
  inputs: InputField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  idPrefix?: string;
}) {
  if (inputs.length === 0) return null;
  return (
    <div className="grid gap-3">
      {inputs.map((f, i) => {
        const id = `${idPrefix}-${f.key}`;
        const set = (v: string) => onChange({ ...values, [f.key]: v });
        return (
          <div key={f.key} className="grid gap-1.5">
            <Label htmlFor={id}>
              {f.label}
              {!f.required && <span className="font-normal text-ink-faint"> (optional)</span>}
            </Label>
            <FieldControl id={id} field={f} value={values[f.key] ?? ""} onChange={set} autoFocus={i === 0} />
            {f.description && <p className="text-[12.5px] text-ink-faint">{f.description}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** What will run, step by step, with each task's inputs filled in as the user types. */
export function PlanPreview({
  plan,
  loading,
  inputs,
  values,
}: {
  plan: Plan | null;
  loading: boolean;
  inputs: InputField[];
  values: Record<string, string>;
}) {
  if (loading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  if (!plan) return null;
  if (plan.errors.length)
    return (
      <ul className="space-y-1.5 rounded-2xl bg-danger-wash px-4 py-3 text-[13.5px] text-ink" role="alert">
        <li className="font-medium text-danger">Fix these in the workflow first:</li>
        {plan.errors.map((issue, i) => (
          <li key={i} className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-danger" />
            {issue.message}
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <ol className="space-y-1.5">
        {plan.steps.map((s, i) => {
          const svc = resolveService(s.service);
          return (
            <li key={s.nodeId} className="flex items-start gap-3 rounded-2xl bg-paper-2 px-3 py-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-raised">
                {svc ? (
                  <AppLogo service={svc} size={18} badge={false} />
                ) : s.kind === "Checker" ? (
                  <GitFork className="size-3.5 rotate-180 text-buttercup-deep" />
                ) : (
                  <UserRoundCheck className="size-3.5 text-lavender-deep" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-ink">
                  {i + 1}. {s.agentName ? humanizeAgentName(s.agentName) : s.label}
                  {svc && <span className="font-normal text-ink-faint">, {SERVICES[svc].name}</span>}
                </span>
                <span className="block text-[13px] leading-relaxed text-ink-soft">
                  {s.kind === "Agent" ? (
                    s.task ? (
                      <TaskText text={s.task} inputs={inputs} values={values} />
                    ) : (
                      "No task set: the agent works it out from the inputs and earlier steps."
                    )
                  ) : s.kind === "Checker" ? (
                    s.condition ? `Continues only if ${s.condition}` : "Continues if the step before succeeded"
                  ) : (
                    s.message || "Pauses for your approval"
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {plan.warnings.length > 0 && (
        <p className="mt-2 text-[12.5px] text-ink-faint">
          {plan.warnings.length === 1 ? "1 node isn't connected" : `${plan.warnings.length} nodes aren't connected`} and will be skipped.
        </p>
      )}
    </>
  );
}
