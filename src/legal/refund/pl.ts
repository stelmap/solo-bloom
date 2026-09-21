import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

export const refundPl: LegalDoc = {
  back: "Powrót na stronę główną",
  title: "Polityka zwrotów",
  updated: LEGAL_LAST_UPDATED.pl,
  intro:
    "Ta polityka wyjaśnia, kiedy możesz anulować subskrypcję Solo .Bizz, w jakich przypadkach przysługuje zwrot pieniędzy i jak go zgłosić.",
  sections: [
    {
      h: "1. Komu płacisz",
      body: [
        "Solo .Bizz prowadzi **jednoosobowa działalność gospodarcza Olha Volodymyrivna Stelmakh**, zarejestrowana we Lwowie, Ukraina. Kontakt: info@solo-bizz.com.",
        "Wszystkie płatności obsługuje **Paddle.com Market Ltd** jako Merchant of Record i reseller usługi. To Paddle widnieje na wyciągu bankowym i wystawia fakturę.",
        "Pytania o płatność lub zwrot: info@solo-bizz.com.",
      ],
    },
    {
      h: "2. Plan bezpłatny",
      body: [
        "Solo .Bizz ma bezpłatny plan bez podawania karty. Zalecamy sprawdzenie w nim, czy usługa pasuje do Twojej praktyki, zanim zapłacisz.",
      ],
    },
    {
      h: "3. Prawo odstąpienia w ciągu 14 dni (konsumenci z UE/EOG i Wielkiej Brytanii)",
      body: [
        "Jeśli jesteś konsumentem w UE/EOG lub Wielkiej Brytanii, możesz odstąpić od zakupu w ciągu 14 dni od daty płatności bez podania przyczyny — zwrócimy całą kwotę.",
        "Dostęp do usługi uruchamiamy od razu po płatności. Nawet gdy prawo pozwala potrącić część kwoty za wykorzystany okres, zwykle tego nie robimy i zwracamy pełną kwotę.",
      ],
    },
    {
      h: "4. Zwroty po 14 dniach",
      body: [
        "Subskrypcja odnawia się automatycznie. Po 14 dniach płatność za rozpoczęty okres zasadniczo nie podlega zwrotowi, ponieważ dostęp do usługi pozostaje aktywny przez cały opłacony okres.",
        "Mimo to zwrócimy pieniądze w całości lub proporcjonalnie, gdy:",
        [
          "awaria po naszej stronie uniemożliwiła korzystanie z usługi przez dłuższy czas i nie udało się jej usunąć;",
          "pobrano opłatę dwukrotnie lub po anulowaniu subskrypcji;",
          "plan roczny lub kwartalny odnowił się automatycznie, a Ty zgłosisz się w ciągu 14 dni od obciążenia, nie korzystając z nowego okresu;",
          "zwrot jest wymagany przez obowiązujące przepisy konsumenckie.",
        ],
      ],
    },
    {
      h: "5. Anulowanie subskrypcji",
      body: [
        "Subskrypcję możesz anulować w każdej chwili w ustawieniach aplikacji lub pisząc na info@solo-bizz.com.",
        "Anulowanie zatrzymuje kolejne obciążenia. Płatny dostęp działa do końca już opłaconego okresu, a Twoje dane pozostają dostępne do tego czasu.",
      ],
    },
    {
      h: "6. Jak zgłosić zwrot",
      body: [
        "Napisz na info@solo-bizz.com z adresu e-mail swojego konta i podaj datę płatności, kwotę oraz krótko powód. Specjalny formularz nie jest potrzebny.",
        "Odpowiadamy w ciągu 5 dni roboczych. Zatwierdzone zwroty realizuje Paddle na tę samą metodę płatności, zwykle w ciągu 5-10 dni roboczych, zależnie od banku.",
      ],
    },
    {
      h: "7. Rabaty i kody promocyjne",
      body: [
        "Zwrot liczymy od faktycznie zapłaconej kwoty, z uwzględnieniem rabatu lub kodu promocyjnego użytego przy płatności.",
      ],
    },
    {
      h: "8. Obciążenia zwrotne (chargeback)",
      body: [
        "Prosimy o kontakt z nami przed zgłoszeniem sporu w banku — niemal każdą sprawę rozwiążemy szybciej bezpośrednio. Konta z otwartym chargebackiem mogą zostać zawieszone do czasu rozstrzygnięcia.",
      ],
    },
    {
      h: "9. Zmiany polityki",
      body: [
        "Możemy aktualizować tę politykę wraz z rozwojem produktu i wymogów prawnych. Data u góry wskazuje aktualną wersję; do Twojej płatności stosuje się polityka obowiązująca w chwili zapłaty.",
      ],
    },
    {
      h: "10. Kontakt",
      body: [
        "Pytania o zwroty i płatności: info@solo-bizz.com.",
        { type: "link", to: "/terms", label: "Regulamin" },
      ],
    },
  ],
};
