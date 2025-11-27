import logo from "../../assets/logo.png";

interface LogoProps {
  width?: number;
  height?: number;
  size?: number;
  className?: string;
  showText?: boolean;
  variant?: "default" | "compact" | "icon-only";
}

function Logo({
  width = 1,
  height = 1,
  size = 30,
  className = "",
  showText = true,
  variant = "default",
}: LogoProps) {
  const isIconOnly = variant === "icon-only" || !showText;
  const isCompact = variant === "compact";

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      style={{ minWidth: `${width}rem`, minHeight: `${height}rem` }}
      role="img"
      aria-label="GoPilot"
    >
      {/* Logo Image */}
      <div
        className="flex-shrink-0 transition-transform duration-200 hover:scale-105"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <img
          src={logo}
          alt="GoPilot Logo"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Logo Text */}
      {!isIconOnly && (
        <div className="flex items-baseline gap-0.5">
          <span
            className={`font-bold tracking-tight text-neutral-900 dark:text-neutral-100 select-none transition-colors ${
              isCompact ? "text-xl" : "text-2xl"
            }`}
          >
            Go
          </span>
          <span
            className={`font-bold tracking-tight text-orange-500 dark:text-orange-400 select-none transition-all duration-300 ${
              isCompact ? "text-xl" : "text-2xl"
            }`}
          >
            Pilot
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;
