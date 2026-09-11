import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

export const cookiesPl: LegalDoc = {
  back: "Powrót na stronę główną",
  title: "Polityka plików cookie",
  updated: LEGAL_LAST_UPDATED.pl,
  intro:
    "Ta Polityka wyjaśnia, jakie pliki cookie i podobne technologie faktycznie stosuje Solo .Bizz, do czego służą i jak nimi zarządzać.",
  sections: [
    {
      h: "1. Czym są pliki cookie i podobne technologie",
      body: [
        "Pliki cookie to niewielkie pliki zapisywane przez przeglądarkę. Do podobnych technologii należy pamięć lokalna przeglądarki, która przechowuje informacje bez wysyłania ich z każdym żądaniem.",
        "Część z nich jest niezbędna do działania strony i aplikacji. Pozostałe są opcjonalne i używane wyłącznie za Twoją zgodą.",
      ],
    },
    {
      h: "2. Stosowane pliki cookie i pamięć przeglądarki",
      body: [
        {
          type: "table",
          headers: ["Nazwa", "Dostawca", "Cel", "Kategoria", "Czas", "Strona"],
          rows: [
            [
              "sb-*-auth-token",
              "Solo .Bizz (Lovable Cloud)",
              "Utrzymuje zalogowanie i sesję",
              "Niezbędne",
              "Do wylogowania lub wygaśnięcia sesji",
              "Własne",
            ],
            [
              "cookie_consent_v1",
              "Solo .Bizz",
              "Zapisuje Twoje wybory dotyczące cookie",
              "Niezbędne",
              "Do wyczyszczenia lub zmiany wyboru",
              "Własne",
            ],
            [
              "app_lang / landing_lang / pre_login_lang",
              "Solo .Bizz",
              "Zapamiętuje wybrany język interfejsu",
              "Niezbędne",
              "Do wyczyszczenia pamięci przeglądarki",
              "Własne",
            ],
            [
              "ph_* (PostHog)",
              "PostHog (EU)",
              "Analityka produktu: używane funkcje i strony",
              "Analityczne",
              "Do 12 miesięcy",
              "Własne",
            ],
            [
              "Pliki i pamięć Plerdy",
              "Plerdy",
              "Analityka korzystania ze strony i mapy ciepła",
              "Analityczne",
              "Zgodnie z ustawieniami dostawcy",
              "Zewnętrzne",
            ],
            [
              "_fbp i powiązane identyfikatory Meta Pixel",
              "Meta",
              "Pomiar skuteczności reklam i atrybucja kampanii",
              "Marketingowe",
              "Do 90 dni",
              "Zewnętrzne",
            ],
            [
              "Pliki cookie Stripe",
              "Stripe",
              "Obsługa płatności i przeciwdziałanie oszustwom",
              "Niezbędne",
              "Zgodnie z ustawieniami dostawcy",
              "Zewnętrzne",
            ],
          ],
        },
        "Niezbędne pliki cookie i pamięć są zawsze aktywne, bo bez nich usługa nie działa. Technologie analityczne i marketingowe ładują się dopiero po zaakceptowaniu odpowiedniej kategorii.",
      ],
    },
    {
      h: "3. Twoja zgoda",
      body: [
        "Przy pierwszej wizycie pojawia się baner zgody z równorzędnymi opcjami: zaakceptuj wszystko, odrzuć wszystko poza niezbędnymi lub zarządzaj preferencjami według kategorii.",
        "Żadna technologia analityczna ani marketingowa nie ładuje się przed udzieleniem zgody. Twój wybór jest zapamiętywany na tym urządzeniu i stosowany przy kolejnych wizytach.",
      ],
    },
    {
      h: "4. Zmiana lub wycofanie zgody",
      body: [
        "Zgodę możesz zmienić lub wycofać w dowolnym momencie linkiem **Ustawienia cookie** w stopce strony. Po wycofaniu odpowiednie technologie nie są dalej ładowane.",
        "Możesz też usunąć pliki cookie i dane strony w ustawieniach przeglądarki. Blokowanie niezbędnych plików może uniemożliwić działanie części usługi.",
      ],
    },
    {
      h: "5. Zmiany tej polityki",
      body: [
        "Jeśli dodamy lub usuniemy technologię, ta polityka i powyższa tabela zostaną zaktualizowane. Data u góry wskazuje aktualną wersję.",
      ],
    },
    {
      h: "6. Kontakt i powiązane dokumenty",
      body: [
        "Pytania o pliki cookie: info@solo-bizz.com.",
        { type: "link", to: "/privacy", label: "Polityka prywatności" },
        { type: "link", to: "/terms", label: "Regulamin" },
      ],
    },
  ],
};
