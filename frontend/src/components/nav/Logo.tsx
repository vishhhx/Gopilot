import { cn } from "@/lib/utils";
import { Blossom, type BlossomMotion } from "@/components/bloom/Blossom";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  variant?: "default" | "compact" | "icon-only";
  motion?: BlossomMotion;
}

/** The blossom mark with the GoPilot wordmark set in the serif. */
function Logo({ size, className, showText = true, variant = "default", motion = "none" }: LogoProps) {
  const iconOnly = variant === "icon-only" || !showText;
  const compact = variant === "compact";
  const mark = size ?? (compact ? 22 : 28);

  return (
    <span
      className={cn("inline-flex items-center gap-2 select-none", className)}
      aria-label="GoPilot"
      role="img"
    >
      <Blossom size={mark} motion={motion} className="petal-hover" />
      {!iconOnly && (
        <span
          className={cn(
            "font-serif font-medium tracking-[-0.02em] text-ink",
            compact ? "text-[19px]" : "text-[23px]"
          )}
          aria-hidden
        >
          GoPilot
        </span>
      )}
    </span>
  );
}

export default Logo;
