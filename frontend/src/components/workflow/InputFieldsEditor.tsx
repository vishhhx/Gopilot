import { Plus, X } from "lucide-react";
import { fieldKey, INPUT_TYPES, typeInfo, type InputField, type InputFieldType } from "@/lib/workflow";
import { SERVICES, type ServiceId } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLogo } from "@/components/bloom/AppLogo";

const BASIC = INPUT_TYPES.filter((t) => !t.service);
const BY_APP = Object.entries(
  INPUT_TYPES.filter((t) => t.service).reduce<Record<string, typeof INPUT_TYPES>>((acc, t) => {
    (acc[t.service!] ??= []).push(t);
    return acc;
  }, {})
) as [ServiceId, typeof INPUT_TYPES][];

/**
 * The values a workflow asks for each time it runs. Steps add them to their task with "Insert an
 * input"; the Run dialog turns them into a form.
 */
export function InputFieldsEditor({ fields, onChange }: { fields: InputField[]; onChange: (fields: InputField[]) => void }) {
  const update = (index: number, patch: Partial<InputField>) =>
    onChange(
      fields.map((f, i) => {
        if (i !== index) return f;
        const next = { ...f, ...patch };
        if (patch.label !== undefined) next.key = fieldKey(patch.label);
        return next;
      })
    );

  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="rounded-2xl bg-paper-2 px-4 py-3 text-[13.5px] text-ink-soft">
          No inputs yet. Add the things that change each run, like a recipient or a date.
        </p>
      )}
      {fields.map((field, i) => (
        <div key={i} className="rounded-2xl bg-paper-2 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={field.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Recipient email"
              aria-label="Field name"
              className="h-9 flex-1 bg-raised"
            />
            <Select value={field.type} onValueChange={(v) => update(i, { type: v as InputFieldType })}>
              <SelectTrigger className="h-9 w-[168px] bg-raised" aria-label="Field type">
                <SelectValue>
                  <span className="flex items-center gap-1.5 truncate">
                    {typeInfo(field.type).service && <AppLogo service={typeInfo(field.type).service!} size={14} badge={false} />}
                    {typeInfo(field.type).label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectGroup>
                  <SelectLabel>Basic</SelectLabel>
                  {BASIC.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {BY_APP.map(([service, types]) => (
                  <SelectGroup key={service}>
                    <SelectLabel className="flex items-center gap-1.5">
                      <AppLogo service={service} size={14} badge={false} />
                      Pick from {SERVICES[service].name}
                    </SelectLabel>
                    {types.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => onChange(fields.filter((_, j) => j !== i))}
              aria-label={`Remove ${field.label || "field"}`}
            >
              <X className="size-4" />
            </Button>
          </div>
          {field.type === "select" && (
            <Input
              value={(field.options ?? []).join(", ")}
              onChange={(e) => update(i, { options: e.target.value.split(",").map((o) => o.trimStart()) })}
              placeholder="Choices, separated by commas: Low, Medium, High"
              aria-label="Choices"
              className="mt-2 h-9 bg-raised"
            />
          )}
          <div className="mt-2 flex items-center gap-3 px-1">
            <label className="inline-flex items-center gap-2 text-[13px] text-ink-soft">
              <Checkbox checked={field.required} onCheckedChange={(v) => update(i, { required: v === true })} />
              Required
            </label>
            {typeInfo(field.type).service && (
              <span className="text-[12.5px] text-ink-faint">Chosen from your {SERVICES[typeInfo(field.type).service!].name} when you run it</span>
            )}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...fields, { key: "", label: "", type: "text", required: true }])}
        disabled={fields.length >= 20}
      >
        <Plus className="size-3.5" />
        Add input
      </Button>
    </div>
  );
}
