import React from "react";
import {
  AlertCircle,
  XCircle,
  WifiOff,
  ServerCrash,
  RefreshCw,
  AlertTriangle,
  Ban,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
type ErrorType =
  | "default"
  | "network"
  | "server"
  | "notFound"
  | "timeout"
  | "unauthorized"
  | "validation";

type ErrorTypeConfig = {
  icon: LucideIcon;
  title: string;
  description: string;
  variant: "default" | "destructive" | "secondary";
};

const ERROR_TYPES: Record<ErrorType, ErrorTypeConfig> = {
  default: {
    icon: AlertCircle,
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    variant: "destructive",
  },
  network: {
    icon: WifiOff,
    title: "Connection Error",
    description:
      "Unable to connect to the server. Please check your internet connection and try again.",
    variant: "default",
  },
  server: {
    icon: ServerCrash,
    title: "Server Error",
    description:
      "Our servers are experiencing issues. Please try again in a few moments.",
    variant: "destructive",
  },
  notFound: {
    icon: XCircle,
    title: "Not Found",
    description: "The requested resource could not be found.",
    variant: "secondary",
  },
  timeout: {
    icon: Clock,
    title: "Request Timeout",
    description: "The request took too long to complete. Please try again.",
    variant: "default",
  },
  unauthorized: {
    icon: Ban,
    title: "Unauthorized",
    description: "You do not have permission to access this resource.",
    variant: "destructive",
  },
  validation: {
    icon: AlertTriangle,
    title: "Validation Error",
    description: "Please check your input and try again.",
    variant: "default",
  },
};

type Size = "sm" | "default" | "lg";

type SizeConfig = {
  container: string;
  iconWrapper: string;
  iconSize: number;
  title: string;
  description: string;
  spacing: string;
  padding: string;
};

const SIZE_CONFIG: Record<Size, SizeConfig> = {
  sm: {
    container: "max-w-sm",
    iconWrapper: "h-12 w-12",
    iconSize: 20,
    title: "text-base",
    description: "text-sm",
    spacing: "space-y-3",
    padding: "p-4",
  },
  default: {
    container: "max-w-md",
    iconWrapper: "h-16 w-16",
    iconSize: 28,
    title: "text-lg",
    description: "text-base",
    spacing: "space-y-4",
    padding: "p-6",
  },
  lg: {
    container: "max-w-lg",
    iconWrapper: "h-20 w-20",
    iconSize: 36,
    title: "text-xl",
    description: "text-lg",
    spacing: "space-y-5",
    padding: "p-8",
  },
};

export interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  error?: Error | { message?: string; stack?: string };
  errorCode?: string;
  onRetry?: () => void | Promise<void>;
  retryText?: string;
  showRetryButton?: boolean;
  isRetrying?: boolean;

  onSecondaryAction?: () => void;
  secondaryActionText?: string;
  showSecondaryButton?: boolean;

  supportEmail?: string;
  supportText?: string;
  showSupportLink?: boolean;

  icon?: LucideIcon;
  iconVariant?: "default" | "destructive" | "secondary";

  className?: string;
  cardClassName?: string;
  iconClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;

  fullHeight?: boolean;
  centered?: boolean;
  size?: Size;
  showCard?: boolean;

  showErrorDetails?: boolean;
  timestamp?: Date | string | number;
  showTimestamp?: boolean;

  children?: React.ReactNode;
  customActions?: React.ReactNode;

  role?: string;
  ariaLive?: "off" | "polite" | "assertive";
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = "default",
  title,
  description,
  error,
  errorCode,
  onRetry,
  retryText = "Try Again",
  showRetryButton = true,
  isRetrying = false,
  onSecondaryAction,
  secondaryActionText = "Go Back",
  showSecondaryButton = false,
  supportEmail,
  supportText = "Contact Support",
  showSupportLink = false,
  icon: CustomIcon,
  iconVariant,
  className,
  cardClassName,
  iconClassName,
  titleClassName,
  descriptionClassName,
  contentClassName,
  fullHeight = true,
  centered = true,
  size = "default",
  showCard = true,
  showErrorDetails = import.meta.env.NODE_ENV === "NODE_ENV ",
  timestamp,
  showTimestamp = false,
  children,
  customActions,
  role = "alert",
  ariaLive = "assertive",
}) => {
  const errorConfig = ERROR_TYPES[type] || ERROR_TYPES.default;
  const Icon = CustomIcon || errorConfig.icon;
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.default;
  const displayTitle = title || errorConfig.title;
  const displayDescription =
    description || error?.message || errorConfig.description;
  const displayVariant = iconVariant || errorConfig.variant;

  const formattedTimestamp = timestamp
    ? new Date(timestamp).toLocaleString()
    : new Date().toLocaleString();

  const errorDetails = error?.stack || error?.toString();
  const hasErrorDetails = showErrorDetails && errorDetails;

  const ErrorContent = () => (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        sizeConfig.spacing,
        contentClassName
      )}
      role={role}
      aria-live={ariaLive}
    >
  
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          "bg-muted",
          sizeConfig.iconWrapper,
          iconClassName
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            displayVariant === "destructive" && "text-destructive"
          )}
          size={sizeConfig.iconSize}
          strokeWidth={1.5}
        />
      </div>

    
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
          <h3
            className={cn(
              "font-semibold tracking-tight",
              sizeConfig.title,
              titleClassName
            )}
          >
            {displayTitle}
          </h3>
          {errorCode && (
            <Badge variant="outline" className="text-xs">
              {errorCode}
            </Badge>
          )}
        </div>

        {showTimestamp && (
          <p className="text-xs text-muted-foreground">{formattedTimestamp}</p>
        )}
      </div>

      {/* Description */}
      <p
        className={cn(
          "text-muted-foreground leading-relaxed max-w-prose",
          sizeConfig.description,
          descriptionClassName
        )}
      >
        {displayDescription}
      </p>


      {hasErrorDetails && (
        <Alert variant="destructive" className="text-left w-full">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <details className="cursor-pointer">
              <summary className="font-medium text-sm mb-2">
                Technical Details (Development Only)
              </summary>
              <pre className="text-xs overflow-auto max-h-32 p-2 rounded bg-muted">
                {errorDetails}
              </pre>
            </details>
          </AlertDescription>
        </Alert>
      )}


      {children && <div className="w-full">{children}</div>}

      
      {(showRetryButton ||
        showSecondaryButton ||
        showSupportLink ||
        customActions) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
          {/* Retry Button */}
          {showRetryButton && onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              className="w-full sm:w-auto"
              size={size === "sm" ? "sm" : "default"}
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")}
              />
              {isRetrying ? "Retrying..." : retryText}
            </Button>
          )}

          {/* Secondary Action Button */}
          {showSecondaryButton && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
              className="w-full sm:w-auto"
              size={size === "sm" ? "sm" : "default"}
            >
              {secondaryActionText}
            </Button>
          )}

          {/* Support Link */}
          {showSupportLink && (
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              size={size === "sm" ? "sm" : "default"}
              asChild
            >
              <a href={supportEmail ? `mailto:${supportEmail}` : "#"}>
                {supportText}
              </a>
            </Button>
          )}

          {/* Custom Actions */}
          {customActions}
        </div>
      )}
    </div>
  );

  // Container wrapper
  const Container = showCard ? Card : "div";
  const containerProps = showCard
    ? { className: cn("w-full", sizeConfig.container, cardClassName) }
    : {};

  return (
    <div
      className={cn(
        "flex w-full",
        centered && "items-center justify-center",
        fullHeight && "min-h-screen",
        !showCard && "p-4",
        className
      )}
    >
      <Container {...containerProps}>
        {showCard ? (
          <CardContent className={cn(sizeConfig.padding, "pt-6")}>
            <ErrorContent />
          </CardContent>
        ) : (
          <ErrorContent />
        )}
      </Container>
    </div>
  );
};

export default ErrorState;
