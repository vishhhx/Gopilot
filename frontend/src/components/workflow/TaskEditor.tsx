import { useLayoutEffect, useRef } from "react";
import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENT_INPUT_SUGGESTIONS, chipClass, fieldKey, typeInfo, type InputField } from "@/lib/workflow";
import { AppLogo } from "@/components/bloom/AppLogo";

const TOKEN_SPLIT = /(\{\{\s*[\w-]+\s*\}\})/;
const TOKEN = /^\{\{\s*([\w-]+)\s*\}\}$/;

/**
 * A task box where inputs appear as chips. Text is stored with {{key}} tokens for the backend, but
 * people only ever see and insert named chips. Chips are plain DOM nodes inside a contentEditable,
 * so React re-renders the content only when the value changes from outside.
 */
export function TaskEditor({
  id,
  value,
  onChange,
  inputs,
  placeholder,
  onAddInput,
  agentName,
  onCreateInput,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  inputs: InputField[];
  placeholder?: string;
  /** opens the workflow's input settings, offered when there are none yet */
  onAddInput?: () => void;
  /** the step's agent, for suggesting the inputs it usually needs */
  agentName?: string;
  /** adds a suggested input to the workflow */
  onCreateInput?: (field: InputField) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const emitted = useRef<string | null>(null);
  const range = useRef<Range | null>(null);
  const labels = inputs.map((f) => `${f.key}:${f.label}`).join("|");
  const taken = new Set(inputs.map((f) => f.key));
  const suggestions: InputField[] = (agentName ? AGENT_INPUT_SUGGESTIONS[agentName] ?? [] : [])
    .map((sug) => ({ ...sug, key: fieldKey(sug.label), required: sug.required ?? true }))
    .filter((sug) => !taken.has(sug.key));

  const chip = (key: string, label?: string) => {
    const field = inputs.find((f) => f.key === key);
    const el = document.createElement("span");
    el.contentEditable = "false";
    el.dataset.key = key;
    el.className = chipClass(field || label ? "input" : "missing");
    el.textContent = field?.label ?? label ?? key.replace(/_/g, " ");
    return el;
  };

  // draw the value, unless it is what this editor just emitted (keeps the caret where it is)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || (value === emitted.current && el.dataset.labels === labels)) return;
    el.replaceChildren();
    for (const part of value.split(TOKEN_SPLIT)) {
      const m = part.match(TOKEN);
      if (m) el.append(chip(m[1]));
      else
        part.split("\n").forEach((line, i) => {
          if (i) el.append(document.createElement("br"));
          if (line) el.append(document.createTextNode(line));
        });
    }
    el.dataset.labels = labels;
    emitted.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, labels]);

  const serialize = (node: Node): string => {
    let out = "";
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? "";
      else if (child instanceof HTMLElement) {
        if (child.dataset.key) out += `{{${child.dataset.key}}}`;
        else if (child.tagName === "BR") out += "\n";
        else out += (child.tagName === "DIV" && out && !out.endsWith("\n") ? "\n" : "") + serialize(child);
      }
    });
    return out;
  };

  const emit = () => {
    if (!ref.current) return;
    const text = serialize(ref.current).replace(/\u00a0/g, " ");
    emitted.current = text;
    onChange(text);
  };

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel?.rangeCount && ref.current?.contains(sel.anchorNode)) range.current = sel.getRangeAt(0).cloneRange();
  };

  const insertInput = (key: string, label?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    let r = range.current && el.contains(range.current.startContainer) ? range.current : null;
    if (!r) {
      r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
    }
    r.deleteContents();
    const space = document.createTextNode("\u00a0");
    r.insertNode(space);
    r.insertNode(chip(key, label));
    r.setStartAfter(space);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    range.current = r.cloneRange();
    emit();
  };

  return (
    <div className="grid gap-2">
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-empty={value.trim() === "" ? "true" : "false"}
        data-placeholder={placeholder}
        onInput={emit}
        onKeyUp={saveRange}
        onMouseUp={saveRange}
        onBlur={saveRange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            document.execCommand("insertLineBreak");
            emit();
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        className={cn(
          "min-h-[96px] w-full rounded-xl border border-line bg-transparent px-3 py-2 text-[14px] leading-relaxed text-ink outline-none",
          "focus-visible:border-clay/45 focus-visible:ring-[3px] focus-visible:ring-clay/15",
          "data-[empty=true]:before:pointer-events-none data-[empty=true]:before:text-ink-faint data-[empty=true]:before:content-[attr(data-placeholder)]"
        )}
      />
      {suggestions.length > 0 && onCreateInput && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[12.5px] font-medium text-ink-soft">
            <Sparkles className="size-3" />
            Suggested for this step
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((sug) => {
              const service = typeInfo(sug.type).service;
              return (
                <button
                  key={sug.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onCreateInput(sug);
                    insertInput(sug.key, sug.label);
                  }}
                  title={`Adds "${sug.label}" (${typeInfo(sug.type).label}) to the workflow's inputs`}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 text-[12.5px] text-ink hover:bg-paper-2"
                >
                  {service ? <AppLogo service={service} size={13} badge={false} /> : <Plus className="size-3 text-ink-soft" />}
                  {sug.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-[12.5px] font-medium text-ink-soft">Insert an input</p>
        {inputs.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {inputs.map((f) => (
              <button
                key={f.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertInput(f.key)}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-cornflower-wash px-2.5 text-[12.5px] font-medium text-cornflower-deep hover:brightness-95"
              >
                <Plus className="size-3" />
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-faint">
            {suggestions.length ? "Pick a suggestion above, or " : "This workflow has no inputs yet. "}
            {onAddInput && (
              <button type="button" onClick={onAddInput} className="font-medium text-clay-ink underline-offset-4 hover:underline">
                {suggestions.length ? "add your own" : "Add one"}
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
