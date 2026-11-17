import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import NotFound from "./NotFound";

vi.mock("@/components/SeoHead", () => ({ SeoHead: () => null }));
vi.mock('@/i18n/LanguageContext', () => ({ setStoredLang: vi.fn(), useLanguage: () => ({ lang: 'en', t: (key: string) => key }) }));

describe("404 recovery", () => {
  it("navigates to the existing homepage without preserving the missing path or query", () => {
    render(
      <MemoryRouter initialEntries={["/this-route-does-not-exist?source=shared"]}>
        <Routes>
          <Route path="/" element={<div data-testid="homepage" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Back to home" }));
    expect(screen.getByTestId("homepage")).toBeInTheDocument();
  });
});