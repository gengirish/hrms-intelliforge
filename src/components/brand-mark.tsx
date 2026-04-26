import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
};

function MarkInner({
  size = "md",
  showText = true,
}: Pick<BrandMarkProps, "size" | "showText">) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-lg gradient-brand font-bold text-white shadow-brand-glow",
          sizeClasses[size]
        )}
      >
        IF
      </span>
      {showText && (
        <span
          className={cn(
            "font-semibold tracking-tight text-white",
            textSizeClasses[size]
          )}
        >
          IntelliForge{" "}
          <span className="text-slate-400 font-normal">AI</span>
        </span>
      )}
    </>
  );
}

export function BrandMark({
  href,
  size = "md",
  showText = true,
  className,
}: BrandMarkProps) {
  const wrapperClass = cn(
    "inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={wrapperClass}
        aria-label="IntelliForge HRMS — Home"
      >
        <MarkInner size={size} showText={showText} />
      </Link>
    );
  }
  return (
    <span className={wrapperClass}>
      <MarkInner size={size} showText={showText} />
    </span>
  );
}
