import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Blossom } from "./Blossom";

/** Petals open one after another while something loads. */
export function BlossomLoader({
  size = 36,
  label,
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-3 text-ink-soft", className)}
    >
      <Blossom size={size} motion="loading" />
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Loading</span>}
    </div>
  );
}

/** Full-area loading state, centred. */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  // Only show after a beat, so fast loads never flash a loader.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      {show && (
        <div className="flex flex-col items-center gap-4 animate-fade">
          <Blossom size={56} motion="loading" />
          <p className="text-sm text-ink-soft" role="status">
            {label}
          </p>
        </div>
      )}
    </div>
  );
}
