import { cn } from "@/lib/utils";
import { SERVICES, type ServiceId } from "@/lib/services";
import { Flower } from "./Flowers";

const FILES: Record<ServiceId, string> = {
  gmail: "Gmail",
  calendar: "Calendar",
  drive: "Drive",
  sheets: "Sheets",
  meet: "Meet",
  forms: "Forms",
};

/**
 * The app's real logo with GoPilot's flower for that app tucked in the corner, as on the
 * Connected apps cards. The badge is left off at very small sizes, where it would be a speck.
 */
export function AppLogo({
  service,
  size = 24,
  badge = size >= 18,
  bloom = false,
  className,
}: {
  service: ServiceId;
  size?: number;
  badge?: boolean;
  /** open the badge's petals when it mounts */
  bloom?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <img
        src={`/apps/${FILES[service]}.svg`}
        alt={SERVICES[service].name}
        width={size}
        height={size}
        draggable={false}
        className="size-full object-contain"
      />
      {badge && (
        <Flower
          service={service}
          size={Math.round(size * 0.55)}
          bloom={bloom}
          className="absolute -right-[22%] -bottom-[22%] drop-shadow-[0_1px_1px_rgb(0_0_0/0.18)]"
        />
      )}
    </span>
  );
}
