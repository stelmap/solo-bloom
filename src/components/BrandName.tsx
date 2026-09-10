import { cn } from "@/lib/utils";

/**
 * Canonical visual brand mark: "Solo" in the primary dark text colour and
 * ".Bizz" (including the dot) in the brand orange accent. Always one line.
 */
export function BrandName({
  className,
  accentClassName = "text-primary",
}: {
  className?: string;
  accentClassName?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap tracking-tight", className)}>
      Solo <span className={accentClassName}>.Bizz</span>
    </span>
  );
}

export default BrandName;
