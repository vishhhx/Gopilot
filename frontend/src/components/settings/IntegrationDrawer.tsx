import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/utils";
import { errorMessage } from "@/lib/format";
import { resolveService, SERVICES } from "@/lib/services";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Blossom, Petal } from "@/components/bloom/Blossom";
import type { Integration } from "./IntegrationCard";
import { AppIcon } from "./AppIcon";

/** Choose which permissions GoPilot asks Google for, then hand over to Google's consent screen. */
export default function IntegrationDrawer({
  open,
  integration,
  onClose,
}: {
  open: boolean;
  integration: Integration;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(integration.connectedScopes ?? []);
  const [connecting, setConnecting] = useState(false);
  const id = resolveService(integration.service) ?? resolveService(integration.displayName);
  const svc = id ? SERVICES[id] : null;
  const all = integration.scopes ?? [];

  useEffect(() => {
    if (open) setSelected(integration.connectedScopes ?? []);
  }, [open, integration]);

  const toggle = (scopeId: string) =>
    setSelected((xs) => (xs.includes(scopeId) ? xs.filter((x) => x !== scopeId) : [...xs, scopeId]));
  const allOn = selected.length === all.length && all.length > 0;

  const connect = async () => {
    if (selected.length === 0) {
      toast.error("Pick at least one permission to continue.");
      return;
    }
    setConnecting(true);
    try {
      const { data } = await axiosInstance.post("/connection/google-service-init", {
        scopes: selected,
        service: integration.service,
      });
      if (!data?.data) throw new Error("The server didn't send a Google sign-in link.");
      window.location.href = data.data;
    } catch (err) {
      toast.error("Couldn't start the connection", { description: errorMessage(err, "Try again in a moment.") });
      setConnecting(false);
    }
  };

  const tint = svc?.petal ?? "var(--peony)";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !connecting && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-4" aria-hidden>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-paper-2">
              <Blossom size={34} motion="sway" />
            </span>
            <span className="relative h-6 flex-1 [container-type:inline-size]">
              <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-line-strong" />
              {[0, 0.85, 1.7].map((delay, i) => (
                <span key={i} className="absolute top-0 left-0 animate-travel motion-reduce:hidden" style={{ animationDelay: `${delay}s` }}>
                  <Petal color={i === 1 ? "var(--clay)" : tint} size={18} rotate={90} />
                </span>
              ))}
            </span>
            <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl", svc ? svc.bgWash : "bg-paper-2")}>
              <AppIcon iconUrl={integration.iconUrl} service={id} size={32} />
            </span>
          </div>
          <SheetTitle className="mt-6 font-serif text-[24px] font-medium tracking-[-0.01em]">
            {integration.isConnected ? `${integration.displayName} permissions` : `Connect ${integration.displayName}`}
          </SheetTitle>
          <SheetDescription className="text-[14.5px] text-ink-soft">
            Choose what GoPilot's {integration.displayName} agents may do. Google will ask you to confirm on the next screen.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-ink-soft">{all.length} permissions</h3>
            <button
              type="button"
              onClick={() => setSelected(allOn ? [] : all.map((s) => s._id))}
              disabled={connecting}
              className="text-[13px] font-medium text-clay-ink underline-offset-4 hover:underline disabled:opacity-50"
            >
              {allOn ? "Clear all" : "Select all"}
            </button>
          </div>
          <ul className="space-y-2">
            {all.map((scope, i) => {
              const on = selected.includes(scope._id);
              return (
                <li key={scope._id} className="animate-rise-sm" style={{ animationDelay: `${i * 60}ms` }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={connecting}
                    onClick={() => toggle(scope._id)}
                    className={cn(
                      "flex w-full items-start gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-colors duration-200 disabled:opacity-60",
                      on ? (svc ? svc.bgWash : "bg-paper-3") : "bg-paper-2 hover:bg-paper-3"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md transition-all duration-300 ease-[var(--ease-bloom)]",
                        on ? "scale-100 text-white dark:text-paper" : "scale-90 border-2 border-line-strong"
                      )}
                      style={on ? { background: svc?.deep ?? "var(--clay)" } : undefined}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium text-ink">{scope.description}</span>
                      <span className="block truncate text-[12.5px] text-ink-faint">{scope.name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-2 border-t border-line px-6 py-4">
          <Button size="lg" className="w-full" onClick={connect} disabled={connecting || selected.length === 0}>
            {connecting && <Blossom size={16} motion="loading" />}
            {connecting ? "Opening Google" : selected.length ? `Continue to Google with ${selected.length} ${selected.length === 1 ? "permission" : "permissions"}` : "Pick at least one permission"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose} disabled={connecting}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
