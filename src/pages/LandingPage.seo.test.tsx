import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { LandingSEO, LandingLangProvider } from "./LandingPage";

function ensureMeta(selector: string, create: () => HTMLMetaElement) {
  if (!document.head.querySelector(selector)) {
    document.head.appendChild(create());
  }
}

function seedHead() {
  document.head.innerHTML = "";
  const mk = (attr: "name" | "property", key: string) => {
    const m = document.createElement("meta");
    m.setAttribute(attr, key);
    m.setAttribute("content", "");
    return m;
  };
  ensureMeta('meta[name="description"]', () => mk("name", "description"));
  ensureMeta('meta[property="og:title"]', () => mk("property", "og:title"));
  ensureMeta('meta[property="og:description"]', () => mk("property", "og:description"));
  ensureMeta('meta[property="og:locale"]', () => mk("property", "og:locale"));
  ensureMeta('meta[name="twitter:title"]', () => mk("name", "twitter:title"));
  ensureMeta('meta[name="twitter:description"]', () => mk("name", "twitter:description"));
}

function getMeta(selector: string): string {
  return document.head.querySelector(selector)?.getAttribute("content") ?? "";
}

describe("LandingSEO localized meta tags", () => {
  beforeEach(() => {
    localStorage.clear();
    seedHead();
  });

  it("renders English meta when lang=en", async () => {
    localStorage.setItem("landing_lang", "en");
    await act(async () => {
      render(
        <LandingLangProvider>
          <LandingSEO />
        </LandingLangProvider>
      );
    });

    expect(document.title).toBe(
      "Solo Bizz — CRM for psychologists, coaches & solo practices"
    );
    expect(document.documentElement.lang).toBe("en");
    expect(getMeta('meta[name="description"]')).toMatch(/psychologists, therapists, coaches and tutors/);
    expect(getMeta('meta[property="og:title"]')).toBe(
      "Solo Bizz — Run your solo practice without the chaos"
    );
    expect(getMeta('meta[property="og:locale"]')).toBe("en_US");
    expect(getMeta('meta[name="twitter:title"]')).toBe(
      "Solo Bizz — Run your solo practice without the chaos"
    );
  });

  it("renders Ukrainian meta when lang=uk", async () => {
    localStorage.setItem("landing_lang", "uk");
    await act(async () => {
      render(
        <LandingLangProvider>
          <LandingSEO />
        </LandingLangProvider>
      );
    });

    expect(document.title).toBe(
      "Solo Bizz — CRM для психологів, коучів і приватної практики"
    );
    expect(document.documentElement.lang).toBe("uk");
    expect(getMeta('meta[name="description"]')).toMatch(/психологам, терапевтам/);
    expect(getMeta('meta[property="og:title"]')).toBe(
      "Solo Bizz — Керуйте приватною практикою без хаосу"
    );
    expect(getMeta('meta[property="og:locale"]')).toBe("uk_UA");
    expect(getMeta('meta[name="twitter:description"]')).toMatch(/Клієнти, сесії/);
  });
});
