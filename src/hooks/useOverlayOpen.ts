import { useEffect, useState } from "react";

/**
 * Tracks whether any primary working overlay (Radix dialog / sheet / drawer /
 * alert dialog) is currently open. Used to give business modals full priority
 * over secondary UI such as the onboarding wizard.
 */
export function useOverlayOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const nodes = document.querySelectorAll(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [aria-modal="true"][data-state="open"]',
      );
      setOpen(nodes.length > 0 || document.body.hasAttribute("data-scroll-locked"));
    };

    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "role", "aria-modal", "data-scroll-locked"],
    });
    return () => observer.disconnect();
  }, []);

  return open;
}
