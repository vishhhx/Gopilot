import { useState } from "react";
import { assetUrl } from "@/utils";
import type { ServiceId } from "@/lib/services";
import { AppLogo } from "@/components/bloom/AppLogo";

/** The app's own icon from the server, or its flower when the icon is missing or fails to load. */
export function AppIcon({ iconUrl, service, size }: { iconUrl?: string; service: ServiceId | null; size: number }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed)
    return <img src={assetUrl(iconUrl)} alt="" onError={() => setFailed(true)} style={{ width: size, height: size }} className="object-contain" />;
  return service ? <AppLogo service={service} size={size} badge={false} /> : null;
}
