import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

export const termsPl: LegalDoc = {
  back: "Powrót na stronę główną",
  title: "Regulamin",
  updated: LEGAL_LAST_UPDATED.pl,
  intro:
    "Niniejszy Regulamin określa zasady korzystania ze strony i aplikacji Solo .Bizz. Prosimy o zapoznanie się z nim przed założeniem konta.",
  sections: [
    {
      h: "1. Kto świadczy usługę",
      body: [
        "Solo .Bizz jest prowadzony przez operatora Solo .Bizz, kontakt: info@solo-bizz.com.",
        "**Uzupełnienie:** pełne dane podmiotu prawnego zostaną opublikowane tutaj po ich formalnym potwierdzeniu.",
        "Zakładając konto lub korzystając z Solo .Bizz, akceptujesz ten Regulamin. Jeśli go nie akceptujesz, prosimy nie korzystać z usługi.",
      ],
    },
    {
      h: "2. Czym jest Solo .Bizz",
      body: [
        "Solo .Bizz to usługa programistyczna wspierająca niezależnych specjalistów w prowadzeniu praktyki. W zależności od planu może obejmować:",
        [
          "kartoteki klientów i historię praktyki;",
          "kalendarz i planowanie sesji, w tym publiczne strony rezerwacji;",
          "notatki z sesji i dokumenty;",
          "umowy i zbieranie zgód;",
          "śledzenie statusu płatności i przegląd finansowy;",
          "powiadomienia i przypomnienia;",
          "raporty i analitykę własnej praktyki.",
        ],
        "Solo .Bizz jest narzędziem organizacyjnym. Nie świadczy usług psychologicznych, medycznych, prawnych, księgowych ani podatkowych i nie nadzoruje Twojej pracy zawodowej.",
      ],
    },
    {
      h: "3. Konta i wymagania",
      body: [
        "Musisz mieć ukończone 18 lat i zdolność do zawarcia umowy.",
        [
          "podawaj prawdziwe dane rejestracyjne i aktualizuj je;",
          "odpowiadasz za poufność danych logowania;",
          "odpowiadasz za działania podejmowane na Twoim koncie;",
          "jedno konto przeznaczone jest dla jednego specjalisty, chyba że plan wyraźnie dopuszcza więcej użytkowników;",
          "niezwłocznie informuj nas o podejrzeniu nieuprawnionego dostępu.",
        ],
        "Możemy zawiesić lub zamknąć konta używane z naruszeniem Regulaminu.",
      ],
    },
    {
      h: "4. Twoja odpowiedzialność zawodowa",
      body: [
        "Pozostajesz w pełni odpowiedzialny za swoją praktykę: jakość i legalność usług, kwalifikacje i uprawnienia, obowiązki zawodowe i etyczne, relacje z klientami oraz kwestie podatkowe i księgowe.",
        "Solo .Bizz to narzędzie używane w Twojej praktyce, a nie strona Twojej relacji z klientami.",
      ],
    },
    {
      h: "5. Plany i ceny",
      body: [
        "Solo .Bizz oferuje plan bezpłatny oraz płatne plany subskrypcyjne. Plany różnią się przede wszystkim liczbą aktywnych klientów i zakresem funkcji.",
        "Aktualne plany, ceny, okresy rozliczeniowe, waluty i obowiązujące rabaty są prezentowane w sekcji cennika na stronie oraz w aplikacji przed potwierdzeniem zakupu. Ceny mogą się zmieniać; dla danego okresu obowiązuje cena widoczna w momencie zakupu.",
        { type: "link", to: "/#pricing", label: "Zobacz aktualne plany i ceny" },
      ],
    },
    {
      h: "6. Subskrypcje, płatności i odnowienie",
      body: [
        "Plany płatne są subskrypcjami cyklicznymi obsługiwanymi przez dostawcę płatności Stripe.",
        [
          "płatność realizowana jest przez Stripe Checkout, a metoda płatności jest zapisywana przy zakupie;",
          "subskrypcja odnawia się automatycznie na koniec każdego okresu, dopóki jej nie anulujesz;",
          "odnowienie jest pobierane z zapisanej metody płatności;",
          "obecnie nie oferujemy bezpłatnego okresu próbnego — jeśli zostanie wprowadzony, jego warunki i długość pokażemy przed zakupem;",
          "nie przechowujemy pełnych danych karty — obsługuje je Stripe;",
          "w razie nieudanej płatności dostęp do funkcji płatnych może zostać ograniczony do czasu opłacenia.",
        ],
        "Subskrypcją, jej anulowaniem i metodą płatności zarządzasz w portalu rozliczeniowym dostępnym na Twoim koncie.",
      ],
    },
    {
      h: "7. Anulowanie, zwroty i prawo odstąpienia",
      body: [
        "Płatną subskrypcję możesz anulować w każdej chwili. Anulowanie zatrzymuje kolejne odnowienia; opłacony dostęp zwykle trwa do końca bieżącego okresu.",
        "Dokonane płatności co do zasady nie podlegają zwrotowi, poza przypadkami wymaganymi prawem lub wyraźnie przez nas uzgodnionymi.",
        "**Konsumenci w UE/EOG:** jeśli jesteś konsumentem, możesz mieć ustawowe prawo odstąpienia w ciągu 14 dni od zawarcia umowy na odległość. Jeżeli żądasz natychmiastowego rozpoczęcia świadczenia usługi cyfrowej w tym okresie i przyjmujesz do wiadomości utratę prawa odstąpienia po pełnym wykonaniu usługi, prawo to może zostać utracone lub ograniczone. Aby z niego skorzystać, napisz na info@solo-bizz.com.",
        "Regulamin nie ogranicza bezwzględnie obowiązujących praw konsumentów.",
      ],
    },
    {
      h: "8. Warunki współpracy",
      body: [
        "Poza Regulaminem obowiązują następujące praktyczne warunki współpracy:",
        [
          "usługa świadczona jest jako ciągła subskrypcja, a nie jednorazowa dostawa;",
          "wsparcie udzielane jest mailowo pod adresem info@solo-bizz.com w dni robocze;",
          "możemy w każdej chwili wydawać aktualizacje, nowe funkcje i ulepszenia;",
          "Twoje dane pozostają Twoje: możesz je wyeksportować lub poprosić o usunięcie;",
          "odpowiadasz za konfigurację produktu dla swojej praktyki: strony rezerwacji, ceny, umowy, powiadomienia;",
          "komunikacja odbywa się głównie mailowo i przez wiadomości w aplikacji.",
        ],
      ],
    },
    {
      h: "9. Dozwolone korzystanie",
      body: [
        "Zobowiązujesz się nie:",
        [
          "korzystać z Solo .Bizz w celach niezgodnych z prawem lub z naruszeniem zasad zawodowych;",
          "przesyłać złośliwego kodu ani zakłócać działania usługi;",
          "podejmować prób nieuprawnionego dostępu do innych kont lub naszych systemów;",
          "dokonywać inżynierii wstecznej, kopiować ani odsprzedawać usługi bez naszej pisemnej zgody;",
          "wykorzystywać usługi do spamu lub niezgodnych z prawem wysyłek;",
          "przechowywać danych, do których przetwarzania nie masz podstawy prawnej.",
        ],
      ],
    },
    {
      h: "10. Dane Twoich klientów",
      body: [
        "To Ty decydujesz, jakie informacje o klientach wprowadzasz do Solo .Bizz. Odpowiadasz za podstawę prawną i za poinformowanie klientów, jeśli jest to wymagane.",
        "Przetwarzamy te dane w celu świadczenia usługi i zgodnie z Polityką prywatności.",
        { type: "link", to: "/privacy", label: "Polityka prywatności" },
      ],
    },
    {
      h: "11. Własność intelektualna",
      body: [
        "Oprogramowanie, marka, projekt i treści Solo .Bizz należą do operatora Solo .Bizz i są chronione prawem własności intelektualnej. Otrzymujesz ograniczone, niewyłączne prawo korzystania z usługi w czasie subskrypcji.",
        "Treści, które tworzysz lub przesyłasz, pozostają Twoje. Udzielasz nam wyłącznie praw niezbędnych do ich hostowania, przetwarzania i wyświetlania w ramach świadczenia usługi.",
      ],
    },
    {
      h: "12. Dostępność i zmiany usługi",
      body: [
        "Dbamy o dostępność Solo .Bizz, ale nie gwarantujemy nieprzerwanego działania. Prace serwisowe, aktualizacje lub problemy u dostawców mogą powodować przerwy.",
        "Możemy dodawać, zmieniać lub wycofywać funkcje. Jeśli wycofujemy istotną funkcję płatną, w miarę możliwości poinformujemy o tym z wyprzedzeniem, a Ty możesz anulować subskrypcję.",
      ],
    },
    {
      h: "13. Odpowiedzialność",
      body: [
        "Usługa świadczona jest „tak jak jest” i „w miarę dostępności”, w zakresie dozwolonym prawem.",
        "Nie odpowiadamy za szkody pośrednie lub następcze, utracone korzyści, utratę klientów ani utratę danych ponad zakres przewidziany prawem. W zakresie dozwolonym prawem nasza łączna odpowiedzialność ogranicza się do kwoty zapłaconej za usługę w ciągu dwunastu miesięcy poprzedzających zdarzenie.",
        "Nie wyłączamy odpowiedzialności, której nie można wyłączyć zgodnie z prawem, w tym za winę umyślną, rażące niedbalstwo lub szkody na osobie, ani bezwzględnych praw konsumentów.",
      ],
    },
    {
      h: "14. Rozwiązanie",
      body: [
        "Możesz zaprzestać korzystania z usługi i usunąć konto w każdej chwili.",
        "Możemy zawiesić lub zakończyć dostęp w razie istotnego naruszenia Regulaminu, gdy wymaga tego prawo lub gdy korzystanie zagraża usłudze albo innym użytkownikom. W miarę możliwości uprzedzimy o tym.",
        "Po zakończeniu Twoje dane są usuwane lub anonimizowane zgodnie z Polityką prywatności.",
      ],
    },
    {
      h: "15. Usługi zewnętrzne",
      body: [
        "Solo .Bizz korzysta z dostawców zewnętrznych: infrastruktury chmurowej, Stripe do płatności, dostawcy wysyłki e-mail, dostawców analityki oraz — jeśli z nich korzystasz — logowania Google i powiadomień Telegram.",
        "Do ich usług stosują się ich własne warunki, a my nie odpowiadamy za ich samodzielne działania lub zaniechania.",
      ],
    },
    {
      h: "16. Prawo właściwe i spory",
      body: [
        "Regulamin podlega prawu miejsca siedziby operatora Solo .Bizz, bez uszczerbku dla bezwzględnie obowiązujących przepisów konsumenckich w kraju Twojego zamieszkania.",
        "**Uzupełnienie:** prawo właściwe i właściwe sądy zostaną wskazane tutaj po potwierdzeniu danych podmiotu prawnego operatora. Konsumenci mogą również skorzystać z platformy internetowego rozstrzygania sporów Komisji Europejskiej.",
        "Zawsze staramy się najpierw rozwiązać spór bezpośrednio — pisz na info@solo-bizz.com.",
      ],
    },
    {
      h: "17. Zmiany Regulaminu",
      body: [
        "Możemy aktualizować Regulamin wraz z rozwojem produktu i zmianami przepisów. Data u góry wskazuje aktualną wersję.",
        "O istotnych zmianach poinformujemy zarejestrowanych użytkowników mailowo lub w aplikacji przed ich wejściem w życie. Dalsze korzystanie z usługi oznacza akceptację zmienionego Regulaminu.",
      ],
    },
    {
      h: "18. Kontakt",
      body: ["Pytania dotyczące Regulaminu: info@solo-bizz.com."],
    },
  ],
};
