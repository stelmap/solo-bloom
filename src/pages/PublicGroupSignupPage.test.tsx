import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), signedUrl: vi.fn().mockResolvedValue({ data: null }), track: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, storage: { from: () => ({ createSignedUrl: mocks.signedUrl }) } } }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ lang: "en" }) }));
import PublicGroupSignupPage from "./PublicGroupSignupPage";

describe("saved owner form preview isolation", () => {
  it("cannot fetch public data, submit applications or emit public analytics", async () => {
    window.__lovableEvents = { track: mocks.track } as any;
    render(<HelmetProvider><MemoryRouter><PublicGroupSignupPage previewInfo={{ name: "Private group", form: { title: "Private saved form", intro: "Existing description", fields: [] } }} /></MemoryRouter></HelmetProvider>);
    await screen.findByRole("heading", { name: "Private saved form" });
    expect(screen.getByRole("button", { name: "Send application" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: "Preview applicant" } });
    const form = screen.getByRole("button", { name: "Send application" }).closest("form");
    if (!form) throw new Error("Missing preview form");
    fireEvent.submit(form); // even bypassing the disabled button must be harmless
    await waitFor(() => expect(mocks.rpc).not.toHaveBeenCalled());
    expect(mocks.track).not.toHaveBeenCalled();
  });
});