import { useEffect, useState } from "react";
import { getFeatureFlag, onFeatureFlagsLoaded } from "@/lib/analytics";

/**
 * Subscribe to a PostHog feature flag.
 * Returns the variant string, boolean for boolean flags, or undefined while loading.
 *
 * Example:
 *   const variant = useFeatureFlag("new-checkout");
 *   if (variant === "test") { ... }
 */
export function useFeatureFlag(flagKey: string): boolean | string | undefined {
  const [value, setValue] = useState<boolean | string | undefined>(() => getFeatureFlag(flagKey));

  useEffect(() => {
    setValue(getFeatureFlag(flagKey));
    const unsub = onFeatureFlagsLoaded(() => setValue(getFeatureFlag(flagKey)));
    return unsub;
  }, [flagKey]);

  return value;
}
