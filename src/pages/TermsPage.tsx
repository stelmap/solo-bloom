import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";

type Section = { h: string; body: (string | string[])[] };
type TermsContent = {
  back: string;
  title: string;
  updated: string;
  sections: Section[];
};

const CONTENT: Record<Language, TermsContent> = {
  en: {
    back: "Back to home",
    title: "Terms & Conditions",
    updated: "Last updated: May 13, 2026",
    sections: [
      { h: "1. Acceptance of Terms", body: ["By creating an account or using SoloBizz, you agree to these Terms & Conditions. If you do not agree to these Terms, please do not use the service."] },
      { h: "2. Description of Service", body: [
        "SoloBizz is a cloud-based business management tool for solo professionals and small private practices, including psychologists, therapists, coaches, tutors, and similar service providers.",
        "SoloBizz provides functionality for client management, session scheduling, payment tracking, income and expense tracking, financial insights, and practice organization.",
        "SoloBizz is intended to support business administration and practice management. Financial insights provided by SoloBizz are for informational purposes only and should not be considered legal, tax, accounting, or financial advice.",
      ] },
      { h: "3. Free Starter Plan", body: [
        "SoloBizz offers a permanent free plan called Free Starter.",
        "Free Starter is not a time-limited free trial. It does not expire after a fixed number of days.",
        "Users may use SoloBizz free of charge while they have up to 5 active clients.",
        "An active client means a client record that is not archived. Archived clients do not count toward the active client limit.",
        "If a Free Starter user attempts to create or reactivate a client and this would exceed the limit of 5 active clients, SoloBizz may require the user to upgrade to a paid subscription plan before adding or reactivating that client.",
      ] },
      { h: "4. Subscription Plans & Billing", body: [
        "SoloBizz offers the following plans:",
        "**Free Starter**",
        "Free Starter costs €0 per month.",
        "This plan allows users to manage up to 5 active clients.",
        "**Solo Practice**",
        "Solo Practice is a paid subscription plan for users who need to manage up to 20 active clients.",
        "The Solo Practice monthly price is: €19 per month.",
        "Solo Practice may also be offered with discounted billing cycles: €45.60 per quarter (quarterly billing) or €136.80 per year (yearly billing).",
        "Quarterly billing includes a 20% discount compared to paying monthly for the same period. Yearly billing includes a 40% discount compared to paying monthly for the same period.",
        "**Pro Practice**",
        "Pro Practice is a paid subscription plan for users who need to manage more than 20 active clients or an unlimited number of active clients.",
        "The Pro Practice monthly price is: €49 per month.",
        "Pro Practice may also be offered with discounted billing cycles: €117.60 per quarter (quarterly billing) or €352.80 per year (yearly billing).",
        "Quarterly billing includes a 20% discount and yearly billing includes a 40% discount compared to paying monthly for the same period.",
      ] },
      { h: "5. Plan Limits and Upgrade Requirements", body: [
        "SoloBizz plans are differentiated by the number of active clients available under each plan.",
        "The current plan limits are: Free Starter: up to 5 active clients; Solo Practice: up to 20 active clients; Pro Practice: unlimited active clients.",
        "If a user reaches the active client limit of their current plan, SoloBizz may restrict the creation or reactivation of additional active clients until the user upgrades to a suitable plan or reduces the number of active clients by archiving existing clients.",
        "If a user archives a client, that client no longer counts toward the active client limit.",
        "If a user reactivates an archived client and this causes the account to exceed the current plan limit, the user may be required to upgrade before the client can be reactivated.",
      ] },
      { h: "6. Payment Method and Auto-Renewal", body: [
        "Payments for paid subscription plans are processed securely through our payment provider.",
        "To subscribe to a paid plan, you may be required to provide a valid payment method.",
        "Paid subscriptions renew automatically according to the selected billing cycle unless cancelled before the renewal date.",
        "The available billing cycles may include monthly, quarterly, and yearly billing.",
        "By subscribing to a paid plan, you authorize SoloBizz or its payment provider to charge the applicable subscription fee according to the selected billing cycle.",
      ] },
      { h: "7. Failed Payments", body: [
        "If a payment fails, we or our payment provider may attempt to charge the payment method again.",
        "If payment is not successfully completed after multiple attempts, SoloBizz may suspend or limit access to paid plan capacity until the payment issue is resolved.",
        "If access is limited due to failed payment, your data will not be intentionally deleted immediately, but your ability to create or reactivate additional clients may be restricted.",
      ] },
      { h: "8. Cancellation & Refunds", body: [
        "You may cancel your paid subscription at any time.",
        "After cancellation, you will retain access to the paid plan until the end of the current paid billing period.",
        "No partial refunds are provided for unused time within a billing period unless required by applicable law.",
        "After the paid billing period ends, your account may be moved to the plan that matches your current number of active clients.",
        "If your number of active clients exceeds the available limit of the applicable plan, you may be required to archive clients or upgrade your subscription to continue creating or reactivating client records.",
      ] },
      { h: "9. Taxes and Currency", body: [
        "Prices are displayed in euros.",
        "Depending on your location and payment provider settings, prices may be shown inclusive or exclusive of applicable taxes.",
        "Any applicable taxes, payment provider fees, or currency conversion charges may be shown during checkout before payment confirmation.",
      ] },
      { h: "10. Your Data", body: [
        "You retain ownership of the data you enter into SoloBizz.",
        "SoloBizz does not sell your data.",
        "We may process your data as necessary to provide, maintain, secure, and improve the service. Some data may be processed by trusted service providers that support the operation of SoloBizz, such as hosting, analytics, communication, or payment processing providers.",
        "Your use of SoloBizz may also be subject to our Privacy Policy.",
        "You may request export or deletion of your data where technically available and legally permitted.",
      ] },
      { h: "11. Acceptable Use", body: [
        "You agree to use SoloBizz only for lawful professional and business purposes.",
        "You must not:",
        [
          "attempt to access another user's data;",
          "interfere with the security or operation of the service;",
          "reverse-engineer, copy, or misuse the platform;",
          "use SoloBizz for illegal, harmful, or unauthorized activities;",
          "upload content that violates applicable laws or third-party rights.",
        ],
      ] },
      { h: "12. Service Availability", body: [
        "We strive to maintain reliable service availability, but we do not guarantee uninterrupted or error-free operation.",
        "SoloBizz may perform maintenance, updates, or improvements from time to time. Where reasonable, we may provide notice of planned maintenance.",
        "SoloBizz is not liable for losses resulting from temporary service interruptions, technical issues, or third-party provider outages.",
      ] },
      { h: "13. Limitation of Liability", body: [
        "SoloBizz is provided on an \"as is\" and \"as available\" basis.",
        "To the maximum extent permitted by applicable law, SoloBizz is not liable for indirect, incidental, special, consequential, or punitive damages arising from the use of the service.",
        "Our total liability for any claim related to the service is limited to the amount you paid to SoloBizz during the 12 months preceding the event that gave rise to the claim.",
        "For users on the Free Starter plan, our total liability is limited to the maximum extent permitted by applicable law.",
      ] },
      { h: "14. Changes to Plans, Prices, and Terms", body: [
        "SoloBizz may update subscription plans, prices, client limits, billing options, or these Terms from time to time.",
        "Registered users will be notified of significant changes by email, in-app notification, or another reasonable method.",
        "Changes to paid subscription prices will not affect an already paid billing period unless required by law or agreed by the user.",
        "Continued use of SoloBizz after changes become effective constitutes acceptance of the updated Terms.",
      ] },
      { h: "15. Contact", body: [
        "For questions about these Terms & Conditions, contact us at:",
        "info@solo-bizz.com",
      ] },
    ],
  },
  fr: {
    back: "Retour à l'accueil",
    title: "Conditions générales",
    updated: "Dernière mise à jour : 13 mai 2026",
    sections: [
      { h: "1. Acceptation des conditions", body: ["En créant un compte ou en utilisant SoloBizz, vous acceptez les présentes Conditions générales. Si vous n'acceptez pas ces Conditions, veuillez ne pas utiliser le service."] },
      { h: "2. Description du service", body: [
        "SoloBizz est un outil de gestion d'activité basé sur le cloud, destiné aux professionnels indépendants et aux petites pratiques privées, notamment psychologues, thérapeutes, coachs, tuteurs et prestataires de services similaires.",
        "SoloBizz offre des fonctionnalités de gestion des clients, de planification des séances, de suivi des paiements, de suivi des revenus et dépenses, d'analyses financières et d'organisation de la pratique.",
        "SoloBizz est conçu pour faciliter l'administration et la gestion d'une activité. Les analyses financières fournies par SoloBizz sont à titre informatif uniquement et ne constituent pas un conseil juridique, fiscal, comptable ou financier.",
      ] },
      { h: "3. Plan Free Starter", body: [
        "SoloBizz propose un plan gratuit permanent appelé Free Starter.",
        "Free Starter n'est pas un essai gratuit limité dans le temps. Il n'expire pas après un nombre de jours fixé.",
        "Les utilisateurs peuvent utiliser SoloBizz gratuitement tant qu'ils ont jusqu'à 5 clients actifs.",
        "Un client actif est une fiche client non archivée. Les clients archivés ne sont pas comptés dans la limite des clients actifs.",
        "Si un utilisateur Free Starter tente de créer ou de réactiver un client et que cela dépasserait la limite de 5 clients actifs, SoloBizz peut exiger qu'il passe à un abonnement payant avant d'ajouter ou de réactiver ce client.",
      ] },
      { h: "4. Plans d'abonnement et facturation", body: [
        "SoloBizz propose les plans suivants :",
        "**Free Starter**",
        "Free Starter coûte 0 € par mois.",
        "Ce plan permet de gérer jusqu'à 5 clients actifs.",
        "**Solo Practice**",
        "Solo Practice est un plan payant pour les utilisateurs souhaitant gérer jusqu'à 20 clients actifs.",
        "Le tarif mensuel de Solo Practice est de 19 € par mois.",
        "Solo Practice peut aussi être facturé : 45,60 € par trimestre (facturation trimestrielle) ou 136,80 € par an (facturation annuelle).",
        "La facturation trimestrielle inclut une remise de 20 % et la facturation annuelle une remise de 40 % par rapport à la facturation mensuelle sur la même période.",
        "**Pro Practice**",
        "Pro Practice est un plan payant pour les utilisateurs souhaitant gérer plus de 20 clients actifs ou un nombre illimité de clients actifs.",
        "Le tarif mensuel de Pro Practice est de 49 € par mois.",
        "Pro Practice peut aussi être facturé : 117,60 € par trimestre ou 352,80 € par an.",
        "La facturation trimestrielle inclut une remise de 20 % et la facturation annuelle une remise de 40 %.",
      ] },
      { h: "5. Limites de plan et conditions de mise à niveau", body: [
        "Les plans SoloBizz se distinguent par le nombre de clients actifs disponibles.",
        "Limites actuelles : Free Starter : jusqu'à 5 clients actifs ; Solo Practice : jusqu'à 20 clients actifs ; Pro Practice : clients actifs illimités.",
        "Si un utilisateur atteint la limite de son plan, SoloBizz peut restreindre la création ou la réactivation de clients supplémentaires jusqu'à la mise à niveau vers un plan adapté ou la réduction du nombre de clients actifs par archivage.",
        "Un client archivé ne compte plus dans la limite des clients actifs.",
        "Si la réactivation d'un client archivé entraîne un dépassement de la limite, une mise à niveau peut être requise avant la réactivation.",
      ] },
      { h: "6. Mode de paiement et renouvellement automatique", body: [
        "Les paiements des abonnements payants sont traités de manière sécurisée par notre prestataire de paiement.",
        "Pour souscrire à un plan payant, un moyen de paiement valide peut être requis.",
        "Les abonnements payants se renouvellent automatiquement selon le cycle de facturation choisi sauf résiliation avant la date de renouvellement.",
        "Les cycles disponibles peuvent inclure : mensuel, trimestriel et annuel.",
        "En souscrivant à un plan payant, vous autorisez SoloBizz ou son prestataire de paiement à débiter le montant correspondant selon le cycle choisi.",
      ] },
      { h: "7. Échecs de paiement", body: [
        "En cas d'échec de paiement, nous ou notre prestataire pouvons tenter à nouveau de débiter le moyen de paiement.",
        "Si le paiement n'aboutit pas après plusieurs tentatives, SoloBizz peut suspendre ou limiter l'accès aux fonctionnalités du plan payant jusqu'à résolution du problème.",
        "En cas d'accès limité pour défaut de paiement, vos données ne seront pas intentionnellement supprimées immédiatement, mais la création ou la réactivation de nouveaux clients peut être restreinte.",
      ] },
      { h: "8. Annulation et remboursements", body: [
        "Vous pouvez annuler votre abonnement payant à tout moment.",
        "Après annulation, vous conserverez l'accès au plan payant jusqu'à la fin de la période de facturation en cours.",
        "Aucun remboursement partiel n'est accordé pour la période non utilisée, sauf si la loi applicable l'exige.",
        "À la fin de la période payée, votre compte peut être basculé vers le plan correspondant à votre nombre de clients actifs.",
        "Si votre nombre de clients actifs dépasse la limite du plan applicable, vous devrez archiver des clients ou mettre à niveau votre abonnement.",
      ] },
      { h: "9. Taxes et devise", body: [
        "Les prix sont affichés en euros.",
        "Selon votre localisation et la configuration du prestataire de paiement, les prix peuvent être affichés taxes incluses ou hors taxes.",
        "Les taxes applicables, frais du prestataire de paiement ou frais de conversion peuvent être indiqués lors du paiement avant confirmation.",
      ] },
      { h: "10. Vos données", body: [
        "Vous conservez la propriété des données saisies dans SoloBizz.",
        "SoloBizz ne vend pas vos données.",
        "Nous traitons vos données dans la mesure nécessaire pour fournir, maintenir, sécuriser et améliorer le service. Certaines données peuvent être traitées par des prestataires de confiance (hébergement, analytique, communication, paiement).",
        "Votre utilisation de SoloBizz est également soumise à notre Politique de confidentialité.",
        "Vous pouvez demander l'export ou la suppression de vos données dans la mesure techniquement possible et légalement autorisée.",
      ] },
      { h: "11. Utilisation acceptable", body: [
        "Vous vous engagez à utiliser SoloBizz uniquement à des fins professionnelles et licites.",
        "Vous ne devez pas :",
        [
          "tenter d'accéder aux données d'un autre utilisateur ;",
          "interférer avec la sécurité ou le fonctionnement du service ;",
          "rétro-concevoir, copier ou utiliser la plateforme de manière abusive ;",
          "utiliser SoloBizz pour des activités illégales, nuisibles ou non autorisées ;",
          "téléverser des contenus violant la loi ou les droits de tiers.",
        ],
      ] },
      { h: "12. Disponibilité du service", body: [
        "Nous nous efforçons d'assurer une disponibilité fiable, sans toutefois garantir un fonctionnement ininterrompu ou exempt d'erreurs.",
        "SoloBizz peut effectuer des opérations de maintenance, mises à jour ou améliorations. Lorsque cela est raisonnable, nous pouvons informer des opérations planifiées.",
        "SoloBizz n'est pas responsable des pertes liées à des interruptions temporaires, problèmes techniques ou pannes de prestataires tiers.",
      ] },
      { h: "13. Limitation de responsabilité", body: [
        "SoloBizz est fourni « en l'état » et « selon disponibilité ».",
        "Dans la mesure maximale permise par la loi applicable, SoloBizz n'est pas responsable des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs découlant de l'utilisation du service.",
        "Notre responsabilité totale pour toute réclamation est limitée au montant que vous avez payé à SoloBizz au cours des 12 mois précédant l'événement ayant donné lieu à la réclamation.",
        "Pour les utilisateurs du plan Free Starter, notre responsabilité totale est limitée dans la mesure maximale permise par la loi applicable.",
      ] },
      { h: "14. Modifications des plans, des prix et des conditions", body: [
        "SoloBizz peut mettre à jour les plans, les prix, les limites de clients, les options de facturation ou ces Conditions de temps à autre.",
        "Les utilisateurs enregistrés seront informés des changements importants par e-mail, notification dans l'application ou tout autre moyen raisonnable.",
        "Les changements de prix ne s'appliquent pas à une période déjà payée, sauf si la loi l'exige ou avec accord de l'utilisateur.",
        "L'utilisation continue de SoloBizz après l'entrée en vigueur des modifications vaut acceptation des Conditions mises à jour.",
      ] },
      { h: "15. Contact", body: [
        "Pour toute question concernant ces Conditions générales, contactez-nous à :",
        "info@solo-bizz.com",
      ] },
    ],
  },
  pl: {
    back: "Powrót do strony głównej",
    title: "Regulamin",
    updated: "Ostatnia aktualizacja: 13 maja 2026",
    sections: [
      { h: "1. Akceptacja warunków", body: ["Tworząc konto lub korzystając z SoloBizz, akceptujesz niniejszy Regulamin. Jeśli nie akceptujesz tych warunków, nie korzystaj z serwisu."] },
      { h: "2. Opis usługi", body: [
        "SoloBizz to narzędzie do zarządzania działalnością w chmurze, przeznaczone dla samodzielnych specjalistów i małych prywatnych praktyk: psychologów, terapeutów, coachów, korepetytorów i podobnych usługodawców.",
        "SoloBizz oferuje funkcje zarządzania klientami, planowania sesji, śledzenia płatności, przychodów i wydatków, analiz finansowych oraz organizacji praktyki.",
        "SoloBizz wspiera administrację i zarządzanie praktyką. Analizy finansowe mają charakter wyłącznie informacyjny i nie stanowią porady prawnej, podatkowej, księgowej ani finansowej.",
      ] },
      { h: "3. Plan Free Starter", body: [
        "SoloBizz oferuje stały bezpłatny plan o nazwie Free Starter.",
        "Free Starter nie jest okresem próbnym ograniczonym czasowo. Nie wygasa po określonej liczbie dni.",
        "Użytkownicy mogą bezpłatnie korzystać z SoloBizz, dopóki mają maksymalnie 5 aktywnych klientów.",
        "Aktywny klient to rekord klienta, który nie został zarchiwizowany. Zarchiwizowani klienci nie są wliczani do limitu.",
        "Jeśli użytkownik Free Starter spróbuje utworzyć lub przywrócić klienta, co spowodowałoby przekroczenie limitu 5 aktywnych klientów, SoloBizz może wymagać przejścia na plan płatny.",
      ] },
      { h: "4. Plany subskrypcji i rozliczenia", body: [
        "SoloBizz oferuje następujące plany:",
        "**Free Starter**",
        "Free Starter kosztuje 0 € miesięcznie.",
        "Plan pozwala zarządzać maksymalnie 5 aktywnymi klientami.",
        "**Solo Practice**",
        "Solo Practice to płatny plan dla użytkowników do 20 aktywnych klientów.",
        "Cena miesięczna Solo Practice: 19 € miesięcznie.",
        "Dostępne także rozliczenia: 45,60 € kwartalnie lub 136,80 € rocznie.",
        "Rozliczenie kwartalne zawiera 20% rabatu, a roczne 40% rabatu względem płatności miesięcznej.",
        "**Pro Practice**",
        "Pro Practice to płatny plan dla użytkowników z ponad 20 aktywnymi klientami lub nieograniczoną liczbą klientów.",
        "Cena miesięczna Pro Practice: 49 € miesięcznie.",
        "Dostępne także: 117,60 € kwartalnie lub 352,80 € rocznie.",
        "Rozliczenie kwartalne: 20% rabatu, roczne: 40% rabatu względem płatności miesięcznej.",
      ] },
      { h: "5. Limity planów i wymagania dotyczące zmiany planu", body: [
        "Plany SoloBizz różnią się liczbą dostępnych aktywnych klientów.",
        "Aktualne limity: Free Starter — do 5 aktywnych klientów; Solo Practice — do 20; Pro Practice — bez limitu.",
        "Po osiągnięciu limitu planu SoloBizz może ograniczyć tworzenie lub przywracanie klientów do czasu zmiany planu lub zarchiwizowania klientów.",
        "Zarchiwizowany klient nie jest wliczany do limitu aktywnych klientów.",
        "Jeśli przywrócenie zarchiwizowanego klienta przekroczy limit, może być wymagana zmiana planu.",
      ] },
      { h: "6. Metoda płatności i automatyczne odnowienie", body: [
        "Płatności za plany płatne są realizowane bezpiecznie przez naszego dostawcę płatności.",
        "Aby subskrybować plan płatny, może być wymagana ważna metoda płatności.",
        "Subskrypcje płatne odnawiają się automatycznie zgodnie z wybranym cyklem rozliczeniowym, chyba że zostaną anulowane przed datą odnowienia.",
        "Dostępne cykle rozliczeniowe: miesięczny, kwartalny i roczny.",
        "Subskrybując plan płatny, upoważniasz SoloBizz lub dostawcę płatności do pobrania opłaty zgodnie z wybranym cyklem.",
      ] },
      { h: "7. Nieudane płatności", body: [
        "W przypadku nieudanej płatności my lub nasz dostawca możemy ponowić obciążenie metody płatności.",
        "Jeśli płatność nie zostanie zrealizowana po wielu próbach, SoloBizz może zawiesić lub ograniczyć dostęp do funkcji planu płatnego.",
        "W przypadku ograniczenia dostępu z powodu nieudanej płatności Twoje dane nie zostaną celowo natychmiast usunięte, lecz tworzenie/przywracanie klientów może być ograniczone.",
      ] },
      { h: "8. Anulowanie i zwroty", body: [
        "Subskrypcję płatną można anulować w dowolnym momencie.",
        "Po anulowaniu zachowasz dostęp do planu płatnego do końca bieżącego okresu rozliczeniowego.",
        "Częściowe zwroty za niewykorzystany czas nie są udzielane, chyba że wymaga tego prawo.",
        "Po zakończeniu okresu płatnego konto może zostać przeniesione do planu odpowiadającego liczbie aktywnych klientów.",
        "Jeśli liczba aktywnych klientów przekracza limit planu, może być wymagane zarchiwizowanie klientów lub zmiana planu.",
      ] },
      { h: "9. Podatki i waluta", body: [
        "Ceny są podawane w euro.",
        "W zależności od lokalizacji i ustawień dostawcy płatności ceny mogą być prezentowane z podatkami lub bez.",
        "Mające zastosowanie podatki, opłaty dostawcy płatności lub przewalutowania mogą być pokazane podczas płatności przed jej potwierdzeniem.",
      ] },
      { h: "10. Twoje dane", body: [
        "Pozostajesz właścicielem danych wprowadzonych do SoloBizz.",
        "SoloBizz nie sprzedaje Twoich danych.",
        "Możemy przetwarzać Twoje dane w zakresie niezbędnym do świadczenia, utrzymania, zabezpieczenia i ulepszania usługi. Niektóre dane mogą być przetwarzane przez zaufanych dostawców (hosting, analityka, komunikacja, płatności).",
        "Korzystanie z SoloBizz podlega także Polityce prywatności.",
        "Możesz wnioskować o eksport lub usunięcie danych w zakresie technicznie możliwym i prawnie dozwolonym.",
      ] },
      { h: "11. Dozwolone użytkowanie", body: [
        "Zobowiązujesz się korzystać z SoloBizz wyłącznie do zgodnych z prawem celów zawodowych.",
        "Nie wolno:",
        [
          "próbować uzyskać dostępu do danych innego użytkownika;",
          "ingerować w bezpieczeństwo lub działanie serwisu;",
          "dokonywać inżynierii wstecznej, kopiować lub niewłaściwie używać platformy;",
          "używać SoloBizz do działań nielegalnych, szkodliwych lub nieautoryzowanych;",
          "przesyłać treści naruszających prawo lub prawa osób trzecich.",
        ],
      ] },
      { h: "12. Dostępność usługi", body: [
        "Dążymy do utrzymania niezawodnej dostępności, lecz nie gwarantujemy nieprzerwanego ani bezbłędnego działania.",
        "SoloBizz może przeprowadzać prace konserwacyjne, aktualizacje lub ulepszenia. Gdy to możliwe, możemy informować o planowanych pracach.",
        "SoloBizz nie odpowiada za straty wynikłe z chwilowych przerw, problemów technicznych lub awarii dostawców zewnętrznych.",
      ] },
      { h: "13. Ograniczenie odpowiedzialności", body: [
        "SoloBizz jest dostarczany w stanie „takim, jaki jest” i „w miarę dostępności”.",
        "W maksymalnym zakresie dozwolonym przez prawo SoloBizz nie odpowiada za szkody pośrednie, przypadkowe, szczególne, wynikowe ani karne.",
        "Nasza całkowita odpowiedzialność jest ograniczona do kwoty zapłaconej SoloBizz w ciągu 12 miesięcy poprzedzających zdarzenie.",
        "Dla użytkowników planu Free Starter odpowiedzialność jest ograniczona w maksymalnym zakresie dozwolonym przez prawo.",
      ] },
      { h: "14. Zmiany planów, cen i regulaminu", body: [
        "SoloBizz może okresowo aktualizować plany, ceny, limity klientów, opcje rozliczeń lub niniejszy Regulamin.",
        "Zarejestrowani użytkownicy zostaną poinformowani o istotnych zmianach e-mailem, powiadomieniem w aplikacji lub innym rozsądnym sposobem.",
        "Zmiany cen nie wpływają na już opłacony okres rozliczeniowy, chyba że wymaga tego prawo lub użytkownik wyrazi zgodę.",
        "Dalsze korzystanie z SoloBizz po wejściu zmian w życie oznacza akceptację zaktualizowanego Regulaminu.",
      ] },
      { h: "15. Kontakt", body: [
        "Pytania dotyczące Regulaminu prosimy kierować na:",
        "info@solo-bizz.com",
      ] },
    ],
  },
  uk: {
    back: "Повернутися на головну",
    title: "Умови та положення",
    updated: "Останнє оновлення: 13 травня 2026",
    sections: [
      { h: "1. Прийняття умов", body: ["Створюючи обліковий запис або користуючись SoloBizz, ви погоджуєтесь з цими Умовами та положеннями. Якщо ви не згодні, не використовуйте сервіс."] },
      { h: "2. Опис сервісу", body: [
        "SoloBizz — це хмарний інструмент для керування діяльністю індивідуальних спеціалістів і невеликих приватних практик: психологів, терапевтів, коучів, репетиторів та інших постачальників послуг.",
        "SoloBizz надає функції керування клієнтами, планування сесій, обліку платежів, доходів і витрат, фінансової аналітики та організації практики.",
        "SoloBizz призначений для підтримки адміністрування та керування практикою. Фінансова аналітика має лише інформаційний характер і не є юридичною, податковою, бухгалтерською чи фінансовою порадою.",
      ] },
      { h: "3. Тариф Free Starter", body: [
        "SoloBizz пропонує постійний безкоштовний тариф Free Starter.",
        "Free Starter не є обмеженою в часі пробною версією. Він не закінчується через певну кількість днів.",
        "Користувачі можуть безкоштовно користуватися SoloBizz, доки мають до 5 активних клієнтів.",
        "Активний клієнт — це запис клієнта, який не заархівовано. Заархівовані клієнти не зараховуються до ліміту активних клієнтів.",
        "Якщо користувач Free Starter намагається створити або відновити клієнта, що перевищить ліміт у 5 активних клієнтів, SoloBizz може вимагати перехід на платний тариф.",
      ] },
      { h: "4. Тарифні плани та оплата", body: [
        "SoloBizz пропонує такі тарифи:",
        "**Free Starter**",
        "Free Starter коштує 0 € на місяць.",
        "Тариф дозволяє керувати до 5 активних клієнтів.",
        "**Solo Practice**",
        "Solo Practice — платний тариф для користувачів, яким потрібно до 20 активних клієнтів.",
        "Місячна ціна Solo Practice: 19 € на місяць.",
        "Solo Practice також доступний: 45,60 € за квартал або 136,80 € на рік.",
        "Квартальна оплата містить знижку 20%, річна — 40% порівняно з помісячною оплатою за той самий період.",
        "**Pro Practice**",
        "Pro Practice — платний тариф для користувачів з понад 20 активних клієнтів або необмеженою кількістю клієнтів.",
        "Місячна ціна Pro Practice: 49 € на місяць.",
        "Pro Practice також доступний: 117,60 € за квартал або 352,80 € на рік.",
        "Квартальна оплата — знижка 20%, річна — 40% порівняно з помісячною оплатою.",
      ] },
      { h: "5. Ліміти тарифів і вимоги до оновлення", body: [
        "Тарифи SoloBizz відрізняються кількістю доступних активних клієнтів.",
        "Поточні ліміти: Free Starter — до 5 активних клієнтів; Solo Practice — до 20; Pro Practice — без обмежень.",
        "Після досягнення ліміту тарифу SoloBizz може обмежити створення або відновлення клієнтів до моменту оновлення тарифу або архівування клієнтів.",
        "Заархівований клієнт не враховується до ліміту активних клієнтів.",
        "Якщо відновлення заархівованого клієнта спричинить перевищення ліміту, може знадобитися оновлення тарифу.",
      ] },
      { h: "6. Спосіб оплати та автоматичне поновлення", body: [
        "Платежі за платні тарифи обробляються безпечно через нашого платіжного провайдера.",
        "Для підписки на платний тариф може знадобитися дійсний спосіб оплати.",
        "Платні підписки автоматично поновлюються відповідно до обраного циклу оплати, якщо не скасовані до дати поновлення.",
        "Доступні цикли оплати: місячний, квартальний і річний.",
        "Підписуючись на платний тариф, ви уповноважуєте SoloBizz або платіжного провайдера списувати відповідну плату згідно з обраним циклом.",
      ] },
      { h: "7. Невдалі платежі", body: [
        "У разі невдалого платежу ми або наш провайдер можемо повторити спробу списання.",
        "Якщо платіж не вдається після кількох спроб, SoloBizz може призупинити або обмежити доступ до можливостей платного тарифу до вирішення проблеми.",
        "У разі обмеження доступу через несплату ваші дані не видалятимуться навмисно одразу, але можливість створення/відновлення клієнтів може бути обмежена.",
      ] },
      { h: "8. Скасування та повернення коштів", body: [
        "Ви можете скасувати платну підписку в будь-який час.",
        "Після скасування ви збережете доступ до платного тарифу до кінця поточного оплаченого періоду.",
        "Часткове повернення коштів за невикористаний період не надається, окрім випадків, передбачених законом.",
        "Після завершення оплаченого періоду обліковий запис може бути переведений на тариф, що відповідає поточній кількості активних клієнтів.",
        "Якщо кількість активних клієнтів перевищує ліміт відповідного тарифу, може знадобитися архівування клієнтів або оновлення підписки.",
      ] },
      { h: "9. Податки та валюта", body: [
        "Ціни вказані в євро.",
        "Залежно від вашого розташування та налаштувань платіжного провайдера ціни можуть відображатися з податками або без них.",
        "Застосовні податки, комісії провайдера або плати за конвертацію валюти можуть відображатися під час оформлення замовлення до підтвердження платежу.",
      ] },
      { h: "10. Ваші дані", body: [
        "Ви залишаєтесь власником даних, які вводите в SoloBizz.",
        "SoloBizz не продає ваші дані.",
        "Ми обробляємо ваші дані в обсязі, необхідному для надання, підтримки, захисту та покращення сервісу. Деякі дані можуть оброблятися довіреними провайдерами (хостинг, аналітика, комунікації, платежі).",
        "Використання SoloBizz також регулюється нашою Політикою конфіденційності.",
        "Ви можете запитати експорт або видалення своїх даних, якщо це технічно можливо і дозволено законом.",
      ] },
      { h: "11. Допустиме використання", body: [
        "Ви погоджуєтесь використовувати SoloBizz лише в законних професійних і ділових цілях.",
        "Заборонено:",
        [
          "намагатися отримати доступ до даних іншого користувача;",
          "втручатися в безпеку або роботу сервісу;",
          "виконувати реверс-інжиніринг, копіювати або зловживати платформою;",
          "використовувати SoloBizz для незаконної, шкідливої чи неавторизованої діяльності;",
          "завантажувати контент, що порушує закон або права третіх осіб.",
        ],
      ] },
      { h: "12. Доступність сервісу", body: [
        "Ми прагнемо забезпечувати надійну доступність, але не гарантуємо безперервну або безпомилкову роботу.",
        "SoloBizz може проводити обслуговування, оновлення або покращення. За можливості ми повідомлятимемо про планові роботи.",
        "SoloBizz не несе відповідальності за збитки внаслідок тимчасових перебоїв, технічних проблем чи збоїв сторонніх провайдерів.",
      ] },
      { h: "13. Обмеження відповідальності", body: [
        "SoloBizz надається «як є» і «за наявності».",
        "У максимально дозволеному законом обсязі SoloBizz не несе відповідальності за непрямі, випадкові, спеціальні, наслідкові або штрафні збитки.",
        "Наша загальна відповідальність обмежується сумою, сплаченою SoloBizz протягом 12 місяців до події, що стала підставою для претензії.",
        "Для користувачів тарифу Free Starter відповідальність обмежується в максимально дозволеному законом обсязі.",
      ] },
      { h: "14. Зміни тарифів, цін та умов", body: [
        "SoloBizz може час від часу оновлювати тарифи, ціни, ліміти клієнтів, варіанти оплати або ці Умови.",
        "Зареєстровані користувачі будуть повідомлені про істотні зміни електронною поштою, сповіщенням у застосунку або іншим прийнятним способом.",
        "Зміни цін не впливають на вже оплачений період, окрім випадків, передбачених законом або погоджених користувачем.",
        "Подальше використання SoloBizz після набрання змін чинності означає прийняття оновлених Умов.",
      ] },
      { h: "15. Контакт", body: [
        "З питань щодо цих Умов та положень звертайтесь:",
        "info@solo-bizz.com",
      ] },
    ],
  },
};

function renderInline(text: string) {
  // Bold **text** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function TermsPage() {
  const { lang } = useLanguage();
  const c = CONTENT[lang] ?? CONTENT.en;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SeoHead
        path="/terms"
        title="Terms & Conditions — Solo Bizz"
        description="Terms governing use of Solo Bizz, including the Free Starter plan, Solo Practice and Pro Practice subscriptions, billing, refunds and acceptable use."
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> {c.back}
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">{c.title}</h1>
        <p className="text-sm text-muted-foreground mb-10">{c.updated}</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          {c.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-xl font-semibold text-foreground">{section.h}</h2>
              {section.body.map((item, i) =>
                Array.isArray(item) ? (
                  <ul key={i} className="list-disc list-inside text-muted-foreground space-y-1">
                    {item.map((li, j) => (
                      <li key={j}>{renderInline(li)}</li>
                    ))}
                  </ul>
                ) : item.includes("info@solo-bizz.com") && !item.includes(":") === false && /^info@/.test(item) ? (
                  <p key={i} className="text-muted-foreground leading-relaxed">
                    <a href="mailto:info@solo-bizz.com" className="text-foreground hover:underline">{item}</a>
                  </p>
                ) : item === "info@solo-bizz.com" ? (
                  <p key={i} className="text-muted-foreground leading-relaxed">
                    <a href="mailto:info@solo-bizz.com" className="text-foreground hover:underline">{item}</a>
                  </p>
                ) : (
                  <p key={i} className="text-muted-foreground leading-relaxed">{renderInline(item)}</p>
                )
              )}
            </section>
          ))}
        </div>
      </div>
      <div className="mt-auto">
        <PublicFooter />
      </div>
    </div>
  );
}
