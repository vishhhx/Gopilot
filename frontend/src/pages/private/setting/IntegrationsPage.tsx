import { useCallback, useEffect, useState } from "react";
import { axiosInstance } from "@/utils";
import { errorMessage } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/Other/common/ErrorState";
import IntegrationCard, { type Integration } from "@/components/settings/IntegrationCard";
import IntegrationDrawer from "@/components/settings/IntegrationDrawer";

const integrationKey = (i: Integration) => (typeof i._id === "string" ? i._id : i._id.$oid);

function IntegrationPage() {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Integration | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get("/connection/get-all-connetions");
      setIntegrations(data.data ?? []);
    } catch (err) {
      setError(errorMessage(err, "Your connected apps didn't load."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connected = integrations?.filter((i) => i.isConnected).length ?? 0;

  return (
    <div>
      <h2 className="font-serif text-[24px] tracking-[-0.01em]">Connected apps</h2>
      <p className="mt-1 max-w-[56ch] text-[15px] text-ink-soft">
        Each app is connected on its own, with only the permissions you pick.
        {integrations && integrations.length > 0 && ` ${connected} of ${integrations.length} connected.`}
      </p>

      {loading && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-[24px] bg-raised p-5 shadow-[0_0_0_1px_var(--line)]">
              <div className="flex gap-4">
                <Skeleton className="size-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
              </div>
              <Skeleton className="mt-4 h-10 w-full" />
            </div>
          ))}
        </div>
      )}

      {error && <ErrorState type="network" title="Your connected apps didn't load" description={error} onRetry={load} className="mt-6" />}

      {!loading && !error && integrations?.length === 0 && (
        <ErrorState type="notFound" title="No apps to connect yet" description="The server hasn't listed any apps. Check back after it's set up." showRetryButton={false} />
      )}

      {!loading && !error && integrations && integrations.length > 0 && (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {integrations.map((inte, i) => (
            <li key={integrationKey(inte)}>
              <IntegrationCard
                integration={inte}
                index={i}
                onConnect={() => {
                  setActive(inte);
                  setOpen(true);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {active && <IntegrationDrawer integration={active} open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

export default IntegrationPage;
