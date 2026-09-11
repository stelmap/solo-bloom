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

/**
 * Renders arbitrary copy while styling every "Solo .Bizz" occurrence with the
 * canonical brand mark (dark "Solo", orange ".Bizz").
 */
export function BrandText({
  text,
  className,
  brandClassName = "font-semibold text-foreground",
  accentClassName = "text-primary",
}: {
  text: string;
  className?: string;
  brandClassName?: string;
  accentClassName?: string;
}) {
  const parts = text.split(/(Solo\s\.Bizz)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^Solo\s\.Bizz$/.test(part) ? (
          <BrandName key={i} className={brandClassName} accentClassName={accentClassName} />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export default BrandName;
