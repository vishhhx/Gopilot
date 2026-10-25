import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveService, SERVICES } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Flower } from "@/components/bloom/Flowers";
import { AppIcon } from "./AppIcon";

export interface Scope {
  _id: string;
  name: string;
  description: string;
}

/** A connection definition from the server, merged with this user's connection to it. */
export interface Integration {
  _id: string | { $oid: string };
  service: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  provider?: string;
  authType?: string;
  isEnabled?: boolean;
  isConnected?: boolean;
  status?: string;
  scopes: Scope[];
  connectedScopes?: string[];
}

function IntegrationCard({ integration, onConnect, index = 0 }: { integration: Integration; onConnect: () => void; index?: number }) {
  const id = resolveService(integration.service) ?? resolveService(integration.displayName);
  const svc = id ? SERVICES[id] : null;
  const connected = Boolean(integration.isConnected);
  const granted = integration.connectedScopes?.length ?? 0;

  return (
    <article
      className="group flex h-full flex-col rounded-[24px] bg-raised p-5 shadow-[0_0_0_1px_var(--line)] transition-[transform,box-shadow] duration-300 animate-rise-sm hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--line-strong),var(--float-shadow)]"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex items-start gap-4">
        <span className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-2xl", svc ? svc.bgWash : "bg-paper-2")}>
          <AppIcon iconUrl={integration.iconUrl} service={id} size={28} />
          {id && (
            <Flower
              service={id}
              size={22}
              className="absolute -right-1.5 -bottom-1.5 transition-transform duration-700 ease-[var(--ease-bloom)] group-hover:rotate-[60deg]"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[20px] leading-tight tracking-[-0.01em]">{integration.displayName}</h3>
          {connected ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-sage-deep">
              <CircleCheck className="size-3.5" />
              Connected{granted ? `, ${granted} ${granted === 1 ? "permission" : "permissions"}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-[13px] text-ink-faint">Not connected</p>
          )}
        </div>
      </div>
      {integration.description && <p className="mt-4 flex-1 text-[14.5px] leading-relaxed text-ink-soft">{integration.description}</p>}
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-ink-faint capitalize">{[integration.provider, integration.authType?.toUpperCase()].filter(Boolean).join(", ")}</span>
        <Button size="sm" variant={connected ? "outline" : "default"} onClick={onConnect}>
          {connected ? "Change permissions" : `Connect ${integration.displayName}`}
        </Button>
      </div>
    </article>
  );
}

export default IntegrationCard;
