import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Link2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { displayValue, issuesMessage, pickerApi, typeInfo, type InputFieldType } from "@/lib/workflow";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLogo } from "@/components/bloom/AppLogo";

type Item = { id: string; name: string; hint?: string };

/**
 * Pick a spreadsheet, file, folder, form, label or calendar from the user's Google account. The
 * value is stored as {"id","name"}; a pasted link is kept as typed and resolved by the server.
 */
export function ResourcePicker({
  id,
  type,
  value,
  onChange,
}: {
  id?: string;
  type: InputFieldType;
  value: string;
  onChange: (value: string) => void;
}) {
  const info = typeInfo(type);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(Boolean(value) && !value.startsWith("{"));

  useEffect(() => {
    if (!open) return;
    setError(null);
    const t = setTimeout(() => {
      setItems(null);
      pickerApi
        .list(type, query)
        .then(setItems)
        .catch((err) => {
          setItems([]);
          setError(issuesMessage(err, "Couldn't load the list."));
        });
    }, 250);
    return () => clearTimeout(t);
  }, [open, query, type]);

  const selectedId = (() => {
    try {
      return value.startsWith("{") ? (JSON.parse(value) as { id?: string }).id : undefined;
    } catch {
      return undefined;
    }
  })();

  if (pasting)
    return (
      <div className="grid gap-1">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Paste the ${info.label.toLowerCase()}'s link or id`} />
        <button type="button" onClick={() => {
            setPasting(false);
            onChange("");
          }} className="w-fit text-[12.5px] text-clay-ink hover:underline">
          Choose from your account instead
        </button>
      </div>
    );

  return (
    <div className="grid gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-line bg-transparent px-3 text-left text-[14.5px] outline-none focus-visible:border-clay/45 focus-visible:ring-[3px] focus-visible:ring-clay/15"
          >
            {info.service && <AppLogo service={info.service} size={18} badge={false} />}
            <span className={cn("min-w-0 flex-1 truncate", !value && "text-ink-faint")}>{displayValue(value) || `Choose a ${info.label.toLowerCase()}`}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-ink-faint" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-2">
          <label className="relative block">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-9 pl-8" autoFocus />
          </label>
          <ul className="mt-2 max-h-64 overflow-y-auto" role="listbox">
            {!items && [0, 1, 2].map((i) => <Skeleton key={i} className="mb-1.5 h-9 w-full rounded-lg" />)}
            {items?.length === 0 && !error && <li className="px-2 py-3 text-[13.5px] text-ink-soft">Nothing found.</li>}
            {error && <li className="px-2 py-2 text-[13px] text-danger">{error}</li>}
            {items?.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === selectedId}
                  onClick={() => {
                    onChange(JSON.stringify({ id: item.id, name: item.name }));
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-paper-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-ink">{item.name}</span>
                    {item.hint && <span className="block truncate text-[12px] text-ink-faint">{item.hint}</span>}
                  </span>
                  {item.id === selectedId && <Check className="size-4 shrink-0 text-sage-deep" />}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {["spreadsheet", "drive_file", "drive_folder", "form"].includes(type) && (
        <button type="button" onClick={() => {
            setPasting(true);
            onChange("");
          }} className="inline-flex w-fit items-center gap-1 text-[12.5px] text-ink-soft hover:text-ink">
          <Link2 className="size-3" />
          Paste a link instead
        </button>
      )}
    </div>
  );
}
