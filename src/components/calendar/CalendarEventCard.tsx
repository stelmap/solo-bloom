import { forwardRef, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CALENDAR_BLOCK_BASE } from "@/lib/calendarBlockStyles";
import { cn } from "@/lib/utils";

export interface CalendarEventCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary title (client or group name) — always rendered, single line, ellipsis. */
  title: string;
  /** Secondary line (service / session type) — hidden when the card is too short. */
  subtitle?: string | null;
  /** Optional type icon rendered on the left in a fixed-width area. */
  leadingIcon?: ReactNode;
  /** Status indicators rendered in a fixed-width area on the right. */
  statusIcons?: ReactNode;
  /** Tint / border classes for this event type. */
  toneClassName?: string;
  /** Rendered height in px — drives whether the subtitle fits. */
  heightPx: number;
  /** Extra tooltip line, e.g. the session status. */
  tooltipMeta?: string | null;
}

/**
 * One shared event-card shell for every calendar block: individual, group and
 * pair sessions, incoming requests and unavailable time.
 *
 * Layout is a 3-area row: fixed leading icon, flexible truncated title and a
 * fixed status area. The status area is reserved before the title width is
 * computed, so status icons can never overlap or clip the title, and a long
 * group name never changes the card height.
 */
export const CalendarEventCard = forwardRef<HTMLDivElement, CalendarEventCardProps>(
  function CalendarEventCard(
    { title, subtitle, leadingIcon, statusIcons, toneClassName, heightPx, tooltipMeta, className, style, ...rest },
    ref,
  ) {
    const showSubtitle = !!subtitle && heightPx >= 38;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={ref}
            role="button"
            tabIndex={0}
            aria-label={[title, subtitle, tooltipMeta].filter(Boolean).join(" · ")}
            className={cn(
              CALENDAR_BLOCK_BASE,
              "flex flex-col justify-center gap-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              toneClassName,
              className,
            )}
            style={style}
            {...rest}
          >
            <div className="flex w-full min-w-0 items-center gap-1">
              {leadingIcon && (
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-70">
                  {leadingIcon}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight">
                {title}
              </span>
              {statusIcons && (
                <span className="flex shrink-0 items-center gap-1 pl-0.5">{statusIcons}</span>
              )}
            </div>
            {showSubtitle && (
              <span className="w-full truncate text-[11px] leading-tight opacity-70">{subtitle}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-72 text-xs">
          <p className="font-medium break-words">{title}</p>
          {subtitle && <p className="opacity-80 break-words">{subtitle}</p>}
          {tooltipMeta && <p className="opacity-70 break-words">{tooltipMeta}</p>}
        </TooltipContent>
      </Tooltip>
    );
  },
);
