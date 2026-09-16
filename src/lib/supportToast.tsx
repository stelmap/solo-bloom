import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { describeError, errorKeyFor, errorText } from "@/lib/errorMessages";
import { askSupport, moduleFromPath, type SupportContext } from "@/lib/support";

type Options = {
  /** Fallback title when the error cannot be mapped to a known message. */
  title?: string;
  /** Raw error object / message coming from the backend. */
  error?: unknown;
  /** Extra technical context, never client data. */
  context?: Partial<SupportContext>;
};

/**
 * Shows a localized error toast with an optional "Ask Support" action that opens
 * the AI helpdesk with the technical context of the failure attached.
 */
export function toastErrorWithSupport({ title, error, context }: Options) {
  const description = error ? describeError(error, undefined, undefined) : undefined;
  const errorCode = error ? errorKeyFor(error) ?? undefined : undefined;
  const pagePath = typeof window !== "undefined" ? window.location.pathname : undefined;

  toast({
    variant: "destructive",
    title: title ?? description ?? errorText("errors.general.unknown"),
    description: title ? description : undefined,
    action: (
      <ToastAction
        altText={errorText("support.askSupport")}
        onClick={() =>
          askSupport({
            module: context?.module ?? moduleFromPath(pagePath ?? "/"),
            pagePath,
            errorCode,
            errorMessage: description,
            ...context,
          })
        }
      >
        {errorText("support.askSupport")}
      </ToastAction>
    ),
  });
}
