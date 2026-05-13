import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";

type Section = { h: string; body: (string | string[])[] };
type PrivacyContent = {
  back: string;
  title: string;
  updated: string;
  sections: Section[];
};

const CONTENT: Record<Language, PrivacyContent> = {
  en: {
    back: "Back to home",
    title: "Privacy Policy",
    updated: "Last updated: May 13, 2026",
    sections: [
      { h: "1. Introduction", body: [
        'SoloBizz ("we", "our", "us") is committed to protecting your privacy and personal data.',
        "This Privacy Policy explains how we collect, use, store, protect, and process personal information when you use SoloBizz.",
        "By using SoloBizz, you agree to the collection and use of information in accordance with this Privacy Policy.",
      ] },
      { h: "2. About SoloBizz", body: [
        "SoloBizz is a cloud-based business management tool for solo professionals and small private practices, including psychologists, therapists, coaches, tutors, consultants, and similar service providers.",
        "SoloBizz helps users manage clients, sessions, schedules, payments, income, expenses, and practice-related business information.",
      ] },
      { h: "3. Contact Details", body: [
        "If you have any questions about this Privacy Policy or your personal data, you can contact us at:",
        "info@solo-bizz.com",
      ] },
      { h: "4. Information We Collect", body: [
        "We may collect and process the following categories of information.",
        "**4.1 Account Information**",
        "When you create an account, we may collect: name; email address; password or authentication credentials; language preferences; subscription plan information; account settings.",
        "Passwords may be processed through secure authentication systems and are not stored by us in plain text.",
        "**4.2 Business and Client Data**",
        "When you use SoloBizz, you may enter business-related data, including: client names and contact details; session dates, times, statuses, and notes; service types; payment statuses; income and expense records; invoices or payment-related information; practice organization data.",
        "This data belongs to you. You are responsible for ensuring that you have the right to enter, store, and process any client or business data you add to SoloBizz.",
        "**4.3 Sensitive or Confidential Data**",
        "SoloBizz is designed for practice and business management. Depending on how you use the service, you may choose to enter information related to clients, sessions, or professional services.",
        "You should avoid entering unnecessary sensitive information unless it is required for your lawful professional use.",
        "You are responsible for deciding what client information is appropriate to store in SoloBizz and for complying with any professional, confidentiality, data protection, or legal obligations that apply to your practice.",
        "**4.4 Payment and Subscription Information**",
        "When you subscribe to a paid plan, payment details are processed securely by our payment provider. We do not store your full card number.",
        "We may store limited billing-related information, such as: subscription plan; billing cycle; payment status; payment provider customer ID; invoice or transaction reference; subscription renewal or cancellation status.",
        "**4.5 Usage and Analytics Data**",
        "We may collect usage data to understand how SoloBizz is used and to improve the product. This may include: pages or screens visited; features used; device and browser information; approximate usage timestamps; error logs; performance data; anonymized or aggregated analytics.",
        "Where possible, we use anonymized or aggregated data for product improvement.",
        "**4.6 Technical Data**",
        "We may collect technical information necessary to operate and secure the service, including: IP address; browser type; device type; operating system; login timestamps; security logs; session information.",
      ] },
      { h: "5. How We Use Your Information", body: [
        "We use your information to: create and manage your SoloBizz account; provide and maintain the SoloBizz service; manage clients, sessions, payments, and practice-related data inside your account; process subscriptions and billing; provide customer support; send important service, billing, security, or account-related notifications; improve product functionality and user experience; monitor system performance and fix technical issues; protect the security of the service; comply with applicable legal obligations.",
        "We do not sell your personal data.",
      ] },
      { h: "6. Legal Basis for Processing", body: [
        "Where applicable data protection laws require a legal basis for processing, we may process personal data based on one or more of the following grounds: performance of a contract with you; your consent; our legitimate interest in operating, securing, and improving SoloBizz; compliance with legal obligations; your instructions as a user of the service when processing business or client data that you enter into SoloBizz.",
        "For business and client data entered by users, the user may act as the data controller, and SoloBizz may act as a service provider or processor, depending on the applicable legal framework and use case.",
      ] },
      { h: "7. Data Ownership", body: [
        "You retain ownership of the business and client data you enter into SoloBizz.",
        "SoloBizz does not claim ownership over your client records, session data, financial records, or other business data.",
        "We do not sell or monetize your business or client data.",
      ] },
      { h: "8. Data Storage and Security", body: [
        "We use reasonable technical and organizational measures to protect your data against unauthorized access, loss, misuse, alteration, or disclosure.",
        "These measures may include: secure cloud infrastructure; encrypted data transmission where applicable; authentication controls; access restrictions; row-level security or equivalent access control mechanisms; monitoring and logging; regular security and system maintenance.",
        "However, no online service can guarantee absolute security. You are responsible for keeping your login credentials secure and for notifying us if you suspect unauthorized access to your account.",
      ] },
      { h: "9. Third-Party Services", body: [
        "We may use trusted third-party service providers to operate SoloBizz. These may include providers for: hosting and cloud infrastructure; authentication; payment processing; email delivery; analytics; customer support; system monitoring and error tracking.",
        "These providers may process personal data only as necessary to provide their services to SoloBizz and are expected to protect data according to applicable security and privacy standards.",
        "Payment processing is handled by our payment provider. We do not store full payment card details on our own servers.",
      ] },
      { h: "10. Cookies and Similar Technologies", body: [
        "We may use cookies or similar technologies that are necessary for: authentication; session management; security; remembering user preferences; maintaining core service functionality.",
        "We may also use analytics technologies to understand product usage and improve SoloBizz.",
        "We do not use cookies to sell personal data.",
        "If we introduce advertising or marketing cookies in the future, we will update this Privacy Policy and, where required, request appropriate consent.",
      ] },
      { h: "11. Data Retention", body: [
        "We retain personal data only for as long as necessary to provide SoloBizz, comply with legal obligations, resolve disputes, enforce agreements, and maintain business records.",
        "Account and business data may be retained while your account is active.",
        "If you delete your account or request deletion, we will delete or anonymize your data within a reasonable period, unless retention is required for legal, tax, accounting, security, fraud prevention, or legitimate business purposes.",
        "Backup copies may remain for a limited period before being securely deleted according to our backup retention procedures.",
      ] },
      { h: "12. Account Deletion and Data Export", body: [
        "You may request to export or delete your data by contacting us at: info@solo-bizz.com",
        "Where technically available and legally permitted, we will support requests to access, export, correct, or delete your data.",
        "If your account is deleted, your active service access will end, and your account data will be removed or anonymized according to our retention rules.",
      ] },
      { h: "13. Your Rights", body: [
        "Depending on your location and applicable law, you may have the right to: access your personal data; correct inaccurate or incomplete data; request deletion of your personal data; request restriction of processing; object to certain processing activities; request data portability; withdraw consent where processing is based on consent; lodge a complaint with a data protection authority.",
        "The European Data Protection Board describes GDPR data subject rights as including the right to be informed, access, rectification, erasure, restriction, portability, objection, and rights related to automated decision-making.",
        "To exercise your rights, contact us at: info@solo-bizz.com",
        "We may need to verify your identity before processing your request.",
      ] },
      { h: "14. International Data Processing", body: [
        "SoloBizz may use cloud providers or service providers located in different countries.",
        "If personal data is transferred internationally, we will take reasonable steps to ensure that appropriate safeguards are used where required by applicable law.",
      ] },
      { h: "15. Children's Privacy", body: [
        "SoloBizz is intended for professional and business use.",
        "SoloBizz is not intended for use by children. We do not knowingly collect personal data from children.",
        "If we become aware that a child has provided personal data without appropriate authorization, we may delete such information.",
      ] },
      { h: "16. Automated Decision-Making", body: [
        "SoloBizz does not use personal data to make legally significant decisions about users based solely on automated processing.",
        "We may use automated systems for operational purposes such as security monitoring, fraud prevention, subscription status management, analytics, or product performance improvement.",
      ] },
      { h: "17. Changes to This Privacy Policy", body: [
        "We may update this Privacy Policy from time to time.",
        "Registered users will be notified of significant changes by email, in-app notification, or another reasonable method.",
        "The updated version will be posted with a revised \"Last updated\" date.",
        "Continued use of SoloBizz after changes become effective means you accept the updated Privacy Policy.",
      ] },
      { h: "18. Contact", body: [
        "If you have questions about this Privacy Policy or want to make a data-related request, contact us at: info@solo-bizz.com",
      ] },
    ],
  },
  fr: {
    back: "Retour à l'accueil",
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 13 mai 2026",
    sections: [
      { h: "1. Introduction", body: [
        'SoloBizz (« nous », « notre », « nos ») s\'engage à protéger votre vie privée et vos données personnelles.',
        "La présente Politique de confidentialité explique comment nous collectons, utilisons, stockons, protégeons et traitons les informations personnelles lorsque vous utilisez SoloBizz.",
        "En utilisant SoloBizz, vous acceptez la collecte et l'utilisation d'informations conformément à la présente Politique de confidentialité.",
      ] },
      { h: "2. À propos de SoloBizz", body: [
        "SoloBizz est un outil de gestion d'activité basé sur le cloud, destiné aux professionnels indépendants et aux petites pratiques privées, notamment psychologues, thérapeutes, coachs, tuteurs, consultants et prestataires de services similaires.",
        "SoloBizz aide les utilisateurs à gérer leurs clients, séances, plannings, paiements, revenus, dépenses et informations professionnelles liées à leur activité.",
      ] },
      { h: "3. Coordonnées de contact", body: [
        "Si vous avez des questions concernant la présente Politique de confidentialité ou vos données personnelles, vous pouvez nous contacter à :",
        "info@solo-bizz.com",
      ] },
      { h: "4. Informations que nous collectons", body: [
        "Nous pouvons collecter et traiter les catégories d'informations suivantes.",
        "**4.1 Informations de compte**",
        "Lors de la création d'un compte, nous pouvons collecter : nom ; adresse e-mail ; mot de passe ou identifiants d'authentification ; préférences linguistiques ; informations relatives au plan d'abonnement ; paramètres de compte.",
        "Les mots de passe peuvent être traités via des systèmes d'authentification sécurisés et ne sont pas stockés en clair par nos soins.",
        "**4.2 Données professionnelles et clients**",
        "Lorsque vous utilisez SoloBizz, vous pouvez saisir des données professionnelles, notamment : noms et coordonnées des clients ; dates, heures, statuts et notes des séances ; types de services ; statuts de paiement ; enregistrements de revenus et dépenses ; factures ou informations relatives aux paiements ; données d'organisation de l'activité.",
        "Ces données vous appartiennent. Vous êtes responsable de vous assurer que vous avez le droit de saisir, stocker et traiter toute donnée client ou professionnelle que vous ajoutez à SoloBizz.",
        "**4.3 Données sensibles ou confidentielles**",
        "SoloBizz est conçu pour la gestion de pratique et d'activité. Selon votre utilisation du service, vous pouvez choisir de saisir des informations relatives à des clients, des séances ou des services professionnels.",
        "Vous devriez éviter de saisir des informations sensibles inutiles, sauf si elles sont requises pour votre usage professionnel légitime.",
        "Vous êtes responsable de décider quelles informations client sont appropriées à stocker dans SoloBizz et de respecter toute obligation professionnelle, de confidentialité, de protection des données ou légale applicable à votre pratique.",
        "**4.4 Informations de paiement et d'abonnement**",
        "Lorsque vous souscrivez à un plan payant, les détails de paiement sont traités de manière sécurisée par notre prestataire de paiement. Nous ne stockons pas votre numéro de carte complet.",
        "Nous pouvons stocker des informations de facturation limitées, telles que : plan d'abonnement ; cycle de facturation ; statut de paiement ; identifiant client du prestataire de paiement ; référence de facture ou de transaction ; statut de renouvellement ou d'annulation de l'abonnement.",
        "**4.5 Données d'utilisation et d'analyse**",
        "Nous pouvons collecter des données d'utilisation pour comprendre comment SoloBizz est utilisé et améliorer le produit. Cela peut inclure : pages ou écrans visités ; fonctionnalités utilisées ; informations sur l'appareil et le navigateur ; horodatages approximatifs d'utilisation ; journaux d'erreurs ; données de performance ; analyses anonymisées ou agrégées.",
        "Dans la mesure du possible, nous utilisons des données anonymisées ou agrégées pour l'amélioration du produit.",
        "**4.6 Données techniques**",
        "Nous pouvons collecter des informations techniques nécessaires au fonctionnement et à la sécurité du service, notamment : adresse IP ; type de navigateur ; type d'appareil ; système d'exploitation ; horodatages de connexion ; journaux de sécurité ; informations de session.",
      ] },
      { h: "5. Comment nous utilisons vos informations", body: [
        "Nous utilisons vos informations pour : créer et gérer votre compte SoloBizz ; fournir et maintenir le service SoloBizz ; gérer les clients, les séances, les paiements et les données professionnelles dans votre compte ; traiter les abonnements et la facturation ; fournir une assistance client ; envoyer des notifications importantes relatives au service, à la facturation, à la sécurité ou au compte ; améliorer les fonctionnalités et l'expérience utilisateur du produit ; surveiller les performances du système et corriger les problèmes techniques ; protéger la sécurité du service ; respecter les obligations légales applicables.",
        "Nous ne vendons pas vos données personnelles.",
      ] },
      { h: "6. Fondement juridique du traitement", body: [
        "Lorsque les lois applicables en matière de protection des données exigent un fondement juridique pour le traitement, nous pouvons traiter les données personnelles sur la base d'un ou plusieurs des motifs suivants : exécution d'un contrat avec vous ; votre consentement ; notre intérêt légitime à exploiter, sécuriser et améliorer SoloBizz ; respect des obligations légales ; vos instructions en tant qu'utilisateur du service lors du traitement des données professionnelles ou clients que vous saisissez dans SoloBizz.",
        "Pour les données professionnelles et clients saisies par les utilisateurs, l'utilisateur peut agir en tant que responsable du traitement, et SoloBizz peut agir en tant que prestataire de services ou sous-traitant, selon le cadre juridique applicable et le cas d'usage.",
      ] },
      { h: "7. Propriété des données", body: [
        "Vous conservez la propriété des données professionnelles et clients que vous saisissez dans SoloBizz.",
        "SoloBizz ne revendique pas la propriété de vos dossiers clients, données de séance, enregistrements financiers ou autres données professionnelles.",
        "Nous ne vendons ni ne monétisons vos données professionnelles ou clients.",
      ] },
      { h: "8. Stockage et sécurité des données", body: [
        "Nous utilisons des mesures techniques et organisationnelles raisonnables pour protéger vos données contre tout accès non autorisé, perte, utilisation abusive, altération ou divulgation.",
        "Ces mesures peuvent inclure : infrastructure cloud sécurisée ; transmission de données chiffrée lorsque applicable ; contrôles d'authentification ; restrictions d'accès ; sécurité au niveau des lignes ou mécanismes de contrôle d'accès équivalents ; surveillance et journalisation ; maintenance régulière de la sécurité et des systèmes.",
        "Cependant, aucun service en ligne ne peut garantir une sécurité absolue. Vous êtes responsable de la confidentialité de vos identifiants de connexion et de nous informer si vous suspectez un accès non autorisé à votre compte.",
      ] },
      { h: "9. Services tiers", body: [
        "Nous pouvons utiliser des prestataires de services tiers de confiance pour exploiter SoloBizz. Ceux-ci peuvent inclure des prestataires pour : hébergement et infrastructure cloud ; authentification ; traitement des paiements ; envoi d'e-mails ; analyse ; assistance client ; surveillance des systèmes et suivi des erreurs.",
        "Ces prestataires peuvent traiter des données personnelles uniquement dans la mesure nécessaire pour fournir leurs services à SoloBizz et sont tenus de protéger les données conformément aux normes de sécurité et de confidentialité applicables.",
        "Le traitement des paiements est assuré par notre prestataire de paiement. Nous ne stockons pas les détails complets des cartes de paiement sur nos propres serveurs.",
      ] },
      { h: "10. Cookies et technologies similaires", body: [
        "Nous pouvons utiliser des cookies ou des technologies similaires nécessaires pour : l'authentification ; la gestion de session ; la sécurité ; la mémorisation des préférences utilisateur ; le maintien des fonctionnalités de base du service.",
        "Nous pouvons également utiliser des technologies d'analyse pour comprendre l'utilisation du produit et améliorer SoloBizz.",
        "Nous n'utilisons pas de cookies pour vendre des données personnelles.",
        "Si nous introduisons des cookies publicitaires ou marketing à l'avenir, nous mettrons à jour la présente Politique de confidentialité et, si nécessaire, demanderons le consentement approprié.",
      ] },
      { h: "11. Conservation des données", body: [
        "Nous conservons les données personnelles uniquement aussi longtemps que nécessaire pour fournir SoloBizz, respecter les obligations légales, résoudre les litiges, faire respecter les accords et maintenir les registres commerciaux.",
        "Les données de compte et professionnelles peuvent être conservées tant que votre compte est actif.",
        "Si vous supprimez votre compte ou demandez la suppression, nous supprimerons ou anonymiserons vos données dans un délai raisonnable, sauf si la conservation est requise à des fins légales, fiscales, comptables, de sécurité, de prévention de la fraude ou d'activité commerciale légitime.",
        "Des copies de sauvegarde peuvent demeurer pendant une période limitée avant d'être supprimées de manière sécurisée conformément à nos procédures de conservation des sauvegardes.",
      ] },
      { h: "12. Suppression de compte et export de données", body: [
        "Vous pouvez demander l'exportation ou la suppression de vos données en nous contactant à : info@solo-bizz.com",
        "Dans la mesure techniquement possible et légalement autorisée, nous prendrons en charge les demandes d'accès, d'exportation, de correction ou de suppression de vos données.",
        "Si votre compte est supprimé, votre accès actif au service prendra fin et les données de votre compte seront supprimées ou anonymisées conformément à nos règles de conservation.",
      ] },
      { h: "13. Vos droits", body: [
        "Selon votre lieu de résidence et la loi applicable, vous pouvez avoir le droit de : accéder à vos données personnelles ; corriger des données inexactes ou incomplètes ; demander la suppression de vos données personnelles ; demander la restriction du traitement ; vous opposer à certaines activités de traitement ; demander la portabilité des données ; retirer votre consentement lorsque le traitement est fondé sur le consentement ; déposer une plainte auprès d'une autorité de protection des données.",
        "Le Conseil européen de la protection des données décrit les droits des personnes concernées au titre du RGPD comme incluant le droit d'être informé, d'accès, de rectification, d'effacement, de restriction, de portabilité, d'opposition et les droits relatifs à la prise de décision automatisée.",
        "Pour exercer vos droits, contactez-nous à : info@solo-bizz.com",
        "Nous pouvons avoir besoin de vérifier votre identité avant de traiter votre demande.",
      ] },
      { h: "14. Traitement international des données", body: [
        "SoloBizz peut utiliser des fournisseurs cloud ou des prestataires de services situés dans différents pays.",
        "Si des données personnelles sont transférées à l'international, nous prendrons des mesures raisonnables pour garantir que des garanties appropriées sont utilisées lorsque la loi applicable l'exige.",
      ] },
      { h: "15. Confidentialité des enfants", body: [
        "SoloBizz est destiné à un usage professionnel et commercial.",
        "SoloBizz n'est pas destiné à être utilisé par des enfants. Nous ne collectons pas sciemment de données personnelles auprès d'enfants.",
        "Si nous prenons conscience qu'un enfant a fourni des données personnelles sans autorisation appropriée, nous pouvons supprimer ces informations.",
      ] },
      { h: "16. Prise de décision automatisée", body: [
        "SoloBizz n'utilise pas de données personnelles pour prendre des décisions juridiquement significatives concernant les utilisateurs sur la base d'un traitement entièrement automatisé.",
        "Nous pouvons utiliser des systèmes automatisés à des fins opérationnelles telles que la surveillance de la sécurité, la prévention de la fraude, la gestion du statut d'abonnement, l'analyse ou l'amélioration des performances du produit.",
      ] },
      { h: "17. Modifications de la présente Politique de confidentialité", body: [
        "Nous pouvons mettre à jour la présente Politique de confidentialité de temps à autre.",
        "Les utilisateurs enregistrés seront informés des changements significatifs par e-mail, notification in-app ou tout autre moyen raisonnable.",
        "La version mise à jour sera publiée avec une date de \"Dernière mise à jour\" révisée.",
        "L'utilisation continue de SoloBizz après l'entrée en vigueur des modifications signifie que vous acceptez la Politique de confidentialité mise à jour.",
      ] },
      { h: "18. Contact", body: [
        "Si vous avez des questions sur la présente Politique de confidentialité ou souhaitez faire une demande relative aux données, contactez-nous à : info@solo-bizz.com",
      ] },
    ],
  },
  pl: {
    back: "Powrót do strony głównej",
    title: "Polityka prywatności",
    updated: "Ostatnia aktualizacja: 13 maja 2026",
    sections: [
      { h: "1. Wprowadzenie", body: [
        'SoloBizz ("my", "nasz", "nas") zobowiązuje się do ochrony Twojej prywatności i danych osobowych.',
        "Niniejsza Polityka prywatności wyjaśnia, w jaki sposób zbieramy, wykorzystujemy, przechowujemy, chronimy i przetwarzamy dane osobowe podczas korzystania z SoloBizz.",
        "Korzystając z SoloBizz, zgadzasz się na zbieranie i wykorzystywanie informacji zgodnie z niniejszą Polityką prywatności.",
      ] },
      { h: "2. O SoloBizz", body: [
        "SoloBizz to oparte na chmurze narzędzie do zarządzania działalnością dla samozatrudnionych profesjonalistów i małych praktyk prywatnych, w tym psychologów, terapeutów, coachów, korepetytorów, konsultantów i podobnych dostawców usług.",
        "SoloBizz pomaga użytkownikom zarządzać klientami, sesjami, harmonogramami, płatnościami, przychodami, wydatkami oraz informacjami biznesowymi związanymi z praktyką.",
      ] },
      { h: "3. Dane kontaktowe", body: [
        "Jeśli masz pytania dotyczące niniejszej Polityki prywatności lub swoich danych osobowych, możesz skontaktować się z nami pod adresem:",
        "info@solo-bizz.com",
      ] },
      { h: "4. Informacje, które zbieramy", body: [
        "Możemy zbierać i przetwarzać następujące kategorie informacji.",
        "**4.1 Informacje o koncie**",
        "Podczas tworzenia konta możemy zbierać: imię i nazwisko; adres e-mail; hasło lub dane uwierzytelniania; preferencje językowe; informacje o planie subskrypcji; ustawienia konta.",
        "Hasła mogą być przetwarzane za pośrednictwem bezpiecznych systemów uwierzytelniania i nie są przez nas przechowywane w postaci zwykłego tekstu.",
        "**4.2 Dane biznesowe i klientów**",
        "Podczas korzystania z SoloBizz możesz wprowadzać dane biznesowe, w tym: imiona i nazwiska klientów oraz dane kontaktowe; daty, godziny, statusy i notatki dotyczące sesji; rodzaje usług; statusy płatności; zapisy przychodów i wydatków; faktury lub informacje związane z płatnościami; dane organizacyjne praktyki.",
        "Te dane należą do Ciebie. Jesteś odpowiedzialny za zapewnienie, że masz prawo do wprowadzania, przechowywania i przetwarzania wszelkich danych klientów lub biznesowych, które dodajesz do SoloBizz.",
        "**4.3 Dane wrażliwe lub poufne**",
        "SoloBizz jest przeznaczony do zarządzania praktyką i działalnością. W zależności od sposobu korzystania z usługi, możesz zdecydować się na wprowadzenie informacji związanych z klientami, sesjami lub usługami zawodowymi.",
        "Należy unikać wprowadzania niepotrzebnych danych wrażliwych, chyba że jest to wymagane do zgodnego z prawem użytkowania zawodowego.",
        "Jesteś odpowiedzialny za decydowanie, jakie informacje o klientach są odpowiednie do przechowywania w SoloBizz oraz za przestrzeganie wszelkich zawodowych, poufnościowych, ochrony danych lub prawnych obowiązków dotyczących Twojej praktyki.",
        "**4.4 Informacje o płatnościach i subskrypcjach**",
        "Podczas subskrybowania płatnego planu dane płatności są przetwarzane bezpiecznie przez naszego dostawcę płatności. Nie przechowujemy pełnego numeru karty.",
        "Możemy przechowywać ograniczone informacje rozliczeniowe, takie jak: plan subskrypcji; cykl rozliczeniowy; status płatności; identyfikator klienta dostawcy płatności; numer faktury lub referencja transakcji; status odnowienia lub anulowania subskrypcji.",
        "**4.5 Dane o użytkowaniu i analityka**",
        "Możemy zbierać dane o użytkowaniu, aby zrozumieć, w jaki sposób SoloBizz jest używany i ulepszyć produkt. Może to obejmować: odwiedzane strony lub ekrany; używane funkcje; informacje o urządzeniu i przeglądarce; przybliżone znaczniki czasowe użytkowania; dzienniki błędów; dane o wydajności; zanonimizowane lub zagregowane analizy.",
        "W miarę możliwości używamy zanonimizowanych lub zagregowanych danych do ulepszania produktu.",
        "**4.6 Dane techniczne**",
        "Możemy zbierać informacje techniczne niezbędne do działania i zabezpieczenia usługi, w tym: adres IP; typ przeglądarki; typ urządzenia; system operacyjny; znaczniki czasowe logowania; dzienniki bezpieczeństwa; informacje o sesji.",
      ] },
      { h: "5. Jak wykorzystujemy Twoje informacje", body: [
        "Wykorzystujemy Twoje informacje do: tworzenia i zarządzania Twoim kontem SoloBizz; świadczenia i utrzymania usługi SoloBizz; zarządzania klientami, sesjami, płatnościami i danymi związanymi z praktyką w Twoim koncie; przetwarzania subskrypcji i rozliczeń; świadczenia wsparcia klienta; wysyłania ważnych powiadomień dotyczących usługi, rozliczeń, bezpieczeństwa lub konta; ulepszania funkcjonalności produktu i doświadczenia użytkownika; monitorowania wydajności systemu i naprawiania problemów technicznych; ochrony bezpieczeństwa usługi; zgodności z obowiązującymi przepisami prawnymi.",
        "Nie sprzedajemy Twoich danych osobowych.",
      ] },
      { h: "6. Podstawa prawna przetwarzania", body: [
        "Tam, gdzie obowiązujące przepisy o ochronie danych wymagają podstawy prawnej do przetwarzania, możemy przetwarzać dane osobowe na podstawie jednego lub więcej z następujących gruntów: wykonanie umowy z Tobą; Twoja zgoda; nasz uzasadniony interes w zakresie działania, zabezpieczenia i ulepszania SoloBizz; zgodność z obowiązkami prawnymi; Twoje instrukcje jako użytkownika usługi podczas przetwarzania danych biznesowych lub klientów, które wprowadzasz do SoloBizz.",
        "W przypadku danych biznesowych i klientów wprowadzanych przez użytkowników, użytkownik może działać jako administrator danych, a SoloBizz może działać jako dostawca usług lub podmiot przetwarzający, w zależności od obowiązującego ramy prawnej i przypadku użycia.",
      ] },
      { h: "7. Własność danych", body: [
        "Zachowujesz własność danych biznesowych i klientów, które wprowadzasz do SoloBizz.",
        "SoloBizz nie rości sobie prawa własności do Twoich zapisów klientów, danych o sesjach, zapisów finansowych ani innych danych biznesowych.",
        "Nie sprzedajemy ani nie monetyzujemy Twoich danych biznesowych lub danych klientów.",
      ] },
      { h: "8. Przechowywanie i bezpieczeństwo danych", body: [
        "Stosujemy rozsądne środki techniczne i organizacyjne w celu ochrony Twoich danych przed nieautoryzowanym dostępem, utratą, niewłaściwym wykorzystaniem, zmianą lub ujawnieniem.",
        "Środki te mogą obejmować: bezpieczną infrastrukturę chmurową; szyfrowaną transmisję danych w stosownych przypadkach; kontrole uwierzytelniania; ograniczenia dostępu; bezpieczeństwo na poziomie wierszy lub równoważne mechanizmy kontroli dostępu; monitorowanie i rejestrowanie; regularne zabezpieczenia i konserwację systemu.",
        "Jednak żadna usługa online nie może zagwarantować bezpieczeństwa absolutnego. Jesteś odpowiedzialny za zabezpieczenie swoich danych logowania i poinformowanie nas, jeśli podejrzewasz nieautoryzowany dostęp do swojego konta.",
      ] },
      { h: "9. Usługi stron trzecich", body: [
        "Możemy korzystać z zaufanych dostawców usług stron trzecich do obsługi SoloBizz. Mogą to być dostawcy: hostingu i infrastruktury chmurowej; uwierzytelniania; przetwarzania płatności; dostarczania e-maili; analityki; wsparcia klienta; monitorowania systemów i śledzenia błędów.",
        "Ci dostawcy mogą przetwarzać dane osobowe tylko w zakresie niezbędnym do świadczenia swoich usług dla SoloBizz i powinni chronić dane zgodnie z obowiązującymi standardami bezpieczeństwa i prywatności.",
        "Przetwarzanie płatności odbywa się za pośrednictwem naszego dostawcy płatności. Nie przechowujemy pełnych danych kart płatniczych na naszych własnych serwerach.",
      ] },
      { h: "10. Pliki cookie i podobne technologie", body: [
        "Możemy używać plików cookie lub podobnych technologii niezbędnych do: uwierzytelniania; zarządzania sesją; bezpieczeństwa; zapamiętywania preferencji użytkownika; utrzymania podstawowych funkcji usługi.",
        "Możemy również używać technologii analitycznych do zrozumienia użytkowania produktu i ulepszania SoloBizz.",
        "Nie używamy plików cookie do sprzedaży danych osobowych.",
        "Jeśli w przyszłości wprowadzimy pliki cookie reklamowe lub marketingowe, zaktualizujemy niniejszą Politykę prywatności i, tam gdzie to wymagane, poprosimy o odpowiednią zgodę.",
      ] },
      { h: "11. Retencja danych", body: [
        "Przechowujemy dane osobowe tylko tak długo, jak jest to konieczne do świadczenia SoloBizz, zgodności z obowiązkami prawnymi, rozwiązywania sporów, egzekwowania umów i prowadzenia rejestrów biznesowych.",
        "Dane konta i biznesowe mogą być przechowywane, dopóki Twoje konto jest aktywne.",
        "Jeśli usuniesz swoje konto lub poprosisz o usunięcie, usuniemy lub zanonimizujemy Twoje dane w rozsądnym terminie, chyba że przechowywanie jest wymagane do celów prawnych, podatkowych, księgowych, bezpieczeństwa, zapobiegania oszustwom lub uzasadnionych celów biznesowych.",
        "Kopie zapasowe mogą pozostać przez ograniczony czas, zanim zostaną bezpiecznie usunięte zgodnie z naszymi procedurami retencji kopii zapasowych.",
      ] },
      { h: "12. Usunięcie konta i eksport danych", body: [
        "Możesz poprosić o eksport lub usunięcie swoich danych, kontaktując się z nami pod adresem: info@solo-bizz.com",
        "W miarę możliwości technicznych i dozwolonych prawnie będziemy wspierać żądania dostępu, eksportu, korekty lub usunięcia danych.",
        "Jeśli Twoje konto zostanie usunięte, aktywny dostęp do usługi zakończy się, a dane konta zostaną usunięte lub zanonimizowane zgodnie z naszymi zasadami retencji.",
      ] },
      { h: "13. Twoje prawa", body: [
        "W zależności od miejsca zamieszkania i obowiązującego prawa możesz mieć prawo do: dostępu do swoich danych osobowych; sprostowania niedokładnych lub niepełnych danych; żądania usunięcia danych osobowych; żądania ograniczenia przetwarzania; sprzeciwu wobec niektórych działań przetwarzania; żądania przenoszalności danych; wycofania zgody, jeśli przetwarzanie opiera się na zgodzie; złożenia skargi do organu ochrony danych.",
        "Europejska Rada Ochrony Danych opisuje prawa podmiotów danych na mocy RODO jako obejmujące prawo do informacji, dostępu, sprostowania, usunięcia, ograniczenia, przenoszalności, sprzeciwu oraz prawa związane z zautomatyzowanym podejmowaniem decyzji.",
        "Aby wykonywać swoje prawa, skontaktuj się z nami pod adresem: info@solo-bizz.com",
        "Możemy być zmuszeni zweryfikować Twoją tożsamość przed przetworzeniem żądania.",
      ] },
      { h: "14. Międzynarodowe przetwarzanie danych", body: [
        "SoloBizz może korzystać z dostawców chmury lub usługodawców zlokalizowanych w różnych krajach.",
        "Jeśli dane osobowe są przekazywane międzynarodowo, podejmiemy rozsądne kroki, aby zapewnić stosowanie odpowiednich zabezpieczeń tam, gdzie wymaga tego obowiązujące prawo.",
      ] },
      { h: "15. Prywatność dzieci", body: [
        "SoloBizz jest przeznaczony do użytku zawodowego i biznesowego.",
        "SoloBizz nie jest przeznaczony do użytku przez dzieci. Nie zbieramy świadomie danych osobowych od dzieci.",
        "Jeśli dowiemy się, że dziecko podało dane osobowe bez odpowiedniego upoważnienia, możemy usunąć takie informacje.",
      ] },
      { h: "16. Automatyczne podejmowanie decyzji", body: [
        "SoloBizz nie wykorzystuje danych osobowych do podejmowania decyzji o znaczeniu prawnym dotyczących użytkowników wyłącznie na podstawie zautomatyzowanego przetwarzania.",
        "Możemy używać systemów zautomatyzowanych do celów operacyjnych, takich jak monitorowanie bezpieczeństwa, zapobieganie oszustwom, zarządzanie statusem subskrypcji, analityka lub poprawa wydajności produktu.",
      ] },
      { h: "17. Zmiany w niniejszej Polityce prywatności", body: [
        "Możemy aktualizować niniejszą Politykę prywatności od czasu do czasu.",
        "Zarejestrowani użytkownicy zostaną powiadomieni o istotnych zmianach drogą mailową, powiadomieniem w aplikacji lub innym rozsądnym sposobem.",
        "Zaktualizowana wersja zostanie opublikowana ze zmienioną datą \"Ostatnia aktualizacja\".",
        "Kontynuowanie korzystania z SoloBizz po wejściu w życie zmian oznacza akceptację zaktualizowanej Polityki prywatności.",
      ] },
      { h: "18. Kontakt", body: [
        "Jeśli masz pytania dotyczące niniejszej Polityki prywatności lub chcesz złożyć żądanie związane z danymi, skontaktuj się z nami pod adresem: info@solo-bizz.com",
      ] },
    ],
  },
  uk: {
    back: "Повернутися на головну",
    title: "Політика конфіденційності",
    updated: "Останнє оновлення: 13 травня 2026",
    sections: [
      { h: "1. Вступ", body: [
        'SoloBizz («ми», «наш», «нас») прагне захищати вашу конфіденційність і персональні дані.',
        "Ця Політика конфіденційності пояснює, як ми збираємо, використовуємо, зберігаємо, захищаємо та обробляємо персональну інформацію під час використання SoloBizz.",
        "Використовуючи SoloBizz, ви погоджуєтесь на збір та використання інформації відповідно до цієї Політики конфіденційності.",
      ] },
      { h: "2. Про SoloBizz", body: [
        "SoloBizz — це хмарний інструмент для управління бізнесом для самозайнятих професіоналів та малих приватних практик, зокрема психологів, терапевтів, коучів, репетиторів, консультантів та подібних постачальників послуг.",
        "SoloBizz допомагає користувачам керувати клієнтами, сеансами, розкладами, платежами, доходами, витратами та бізнес-інформацією, пов'язаною з практикою.",
      ] },
      { h: "3. Контактні дані", body: [
        "Якщо у вас є запитання щодо цієї Політики конфіденційності або ваших персональних даних, ви можете зв'язатися з нами за адресою:",
        "info@solo-bizz.com",
      ] },
      { h: "4. Інформація, яку ми збираємо", body: [
        "Ми можемо збирати та обробляти такі категорії інформації.",
        "**4.1 Інформація облікового запису**",
        "Під час створення облікового запису ми можемо збирати: ім'я; адресу електронної пошти; пароль або облікові дані для автентифікації; мовні налаштування; інформацію про план підписки; налаштування облікового запису.",
        "Паролі можуть оброблятися через безпечні системи автентифікації та не зберігаються нами у відкритому вигляді.",
        "**4.2 Бізнес-дані та дані клієнтів**",
        "Використовуючи SoloBizz, ви можете вводити бізнес-дані, зокрема: імена та контактні дані клієнтів; дати, час, статуси та нотатки сеансів; типи послуг; статуси платежів; записи доходів та витрат; рахунки-фактури або інформацію, пов'язану з платежами; організаційні дані практики.",
        "Ці дані належать вам. Ви несете відповідальність за те, щоб мати право вводити, зберігати та обробляти будь-які дані клієнтів або бізнес-дані, які ви додаєте до SoloBizz.",
        "**4.3 Чутливі або конфіденційні дані**",
        "SoloBizz призначений для управління практикою та бізнесом. Залежно від того, як ви використовуєте сервіс, ви можете вибрати введення інформації, пов'язаної з клієнтами, сеансами або професійними послугами.",
        "Ви повинні уникати введення непотрібних чутливих даних, якщо це не потрібно для вашого законного професійного використання.",
        "Ви несете відповідальність за вирішення, яка інформація про клієнтів доречна для зберігання в SoloBizz, та за дотримання будь-яких професійних, конфіденційних, захисту даних або юридичних зобов'язань, що застосовуються до вашої практики.",
        "**4.4 Інформація про платежі та підписки**",
        "Під час підписки на платний план дані про платіж обробляються безпечно нашим постачальником платежів. Ми не зберігаємо повний номер вашої картки.",
        "Ми можемо зберігати обмежену інформацію, пов'язану з виставленням рахунків, таку як: план підписки; цикл виставлення рахунків; статус платежу; ідентифікатор клієнта постачальника платежів; номер рахунка-фактури або референс транзакції; статус поновлення або скасування підписки.",
        "**4.5 Дані про використання та аналітика**",
        "Ми можемо збирати дані про використання, щоб зрозуміти, як використовується SoloBizz, та покращити продукт. Це може включати: відвідувані сторінки або екрани; використовувані функції; інформацію про пристрій і браузер; приблизні часові позначки використання; журнали помилок; дані про продуктивність; анонімізовану або агреговану аналітику.",
        "За можливості ми використовуємо анонімізовані або агреговані дані для покращення продукту.",
        "**4.6 Технічні дані**",
        "Ми можемо збирати технічну інформацію, необхідну для роботи та безпеки сервісу, зокрема: IP-адресу; тип браузера; тип пристрою; операційну систему; часові позначки входу; журнали безпеки; інформацію про сеанс.",
      ] },
      { h: "5. Як ми використовуємо вашу інформацію", body: [
        "Ми використовуємо вашу інформацію для: створення та управління вашим обліковим записом SoloBizz; надання та підтримки сервісу SoloBizz; управління клієнтами, сеансами, платежами та бізнес-даними в вашому обліковому записі; обробки підписок та виставлення рахунків; надання підтримки клієнтів; надсилання важливих повідомлень про сервіс, рахунки, безпеку або обліковий запис; покращення функціональності продукту та користувацького досвіду; моніторингу продуктивності системи та усунення технічних проблем; захисту безпеки сервісу; дотримання застосовних юридичних зобов'язань.",
        "Ми не продаємо ваші персональні дані.",
      ] },
      { h: "6. Правові підстави обробки", body: [
        "Там, де застосовні закони про захист даних вимагають правової підстави для обробки, ми можемо обробляти персональні дані на підставі однієї або кількох з наступних підстав: виконання договору з вами; ваша згода; наш законний інтерес у функціонуванні, захисті та покращенні SoloBizz; дотримання юридичних зобов'язань; ваші інструкції як користувача сервісу під час обробки бізнес-даних або даних клієнтів, які ви вводите в SoloBizz.",
        "Щодо бізнес-даних та даних клієнтів, введених користувачами, користувач може діяти як контролер даних, а SoloBizz — як постачальник послуг або обробник, залежно від застосовної правової рамки та випадку використання.",
      ] },
      { h: "7. Власність на дані", body: [
        "Ви зберігаєте право власності на бізнес-дані та дані клієнтів, які ви вводите в SoloBizz.",
        "SoloBizz не претендує на право власності на ваші записи клієнтів, дані про сеанси, фінансові записи або інші бізнес-дані.",
        "Ми не продаємо та не монетизуємо ваші бізнес-дані або дані клієнтів.",
      ] },
      { h: "8. Зберігання та безпека даних", body: [
        "Ми використовуємо розумні технічні та організаційні заходи для захисту ваших даних від несанкціонованого доступу, втрати, неправомірного використання, зміни або розголошення.",
        "Ці заходи можуть включати: безпечну хмарну інфраструктуру; шифрування передачі даних, де це доречно; засоби контролю автентифікації; обмеження доступу; безпеку на рівні рядків або еквівалентні механізми контролю доступу; моніторинг та журналювання; регулярне обслуговування безпеки та системи.",
        "Однак жоден онлайн-сервіс не може гарантувати абсолютну безпеку. Ви несете відповідальність за збереження своїх облікових даних у безпеці та повідомлення нам, якщо ви підозрюєте несанкціонований доступ до вашого облікового запису.",
      ] },
      { h: "9. Сторонні сервіси", body: [
        "Ми можемо використовувати надійних сторонніх постачальників послуг для роботи SoloBizz. Це можуть бути постачальники: хостингу та хмарної інфраструктури; автентифікації; обробки платежів; доставки електронної пошти; аналітики; підтримки клієнтів; моніторингу систем та відстеження помилок.",
        "Ці постачальники можуть обробляти персональні дані лише в обсязі, необхідному для надання своїх послуг для SoloBizz, і повинні захищати дані відповідно до застосовних стандартів безпеки та конфіденційності.",
        "Обробка платежів здійснюється нашим постачальником платежів. Ми не зберігаємо повні дані платіжних карток на наших власних серверах.",
      ] },
      { h: "10. Файли cookie та подібні технології", body: [
        "Ми можемо використовувати файли cookie або подібні технології, необхідні для: автентифікації; управління сеансом; безпеки; запам'ятовування налаштувань користувача; підтримки основних функцій сервісу.",
        "Ми також можемо використовувати аналітичні технології для розуміння використання продукту та покращення SoloBizz.",
        "Ми не використовуємо файли cookie для продажу персональних даних.",
        "Якщо ми введемо рекламні або маркетингові файли cookie в майбутньому, ми оновимо цю Політику конфіденційності та, де потрібно, запросимо відповідну згоду.",
      ] },
      { h: "11. Зберігання даних", body: [
        "Ми зберігаємо персональні дані лише стільки, скільки це необхідно для надання SoloBizz, дотримання юридичних зобов'язань, вирішення спорів, виконання угод та ведення бізнес-записів.",
        "Дані облікового запису та бізнес-дані можуть зберігатися, поки ваш обліковий запис активний.",
        "Якщо ви видалите свій обліковий запис або надішлете запит на видалення, ми видалимо або анонімізуємо ваші дані в розумний термін, якщо зберігання не є обов'язковим для юридичних, податкових, бухгалтерських, безпекових, запобігання шахрайству або законних бізнес-цілей.",
        "Резервні копії можуть залишатися протягом обмеженого часу, перш ніж бути безпечно видаленими відповідно до наших процедур зберігання резервних копій.",
      ] },
      { h: "12. Видалення облікового запису та експорт даних", body: [
        "Ви можете надіслати запит на експорт або видалення своїх даних, зв'язавшись з нами за адресою: info@solo-bizz.com",
        "За технічної можливості та юридичного дозволу ми підтримаємо запити на доступ, експорт, виправлення або видалення ваших даних.",
        "Якщо ваш обліковий запис буде видалено, активний доступ до сервісу припиниться, а дані облікового запису будуть видалені або анонімізовані відповідно до наших правил зберігання.",
      ] },
      { h: "13. Ваші права", body: [
        "Залежно від вашого місця розташування та застосовного закону, ви можете мати право на: доступ до своїх персональних даних; виправлення неточних або неповних даних; запит на видалення своїх персональних даних; запит на обмеження обробки; заперечення проти певних видів обробки; запит на переносимість даних; відкликання згоди, якщо обробка базується на згоді; подання скарги до органу захисту даних.",
        "Європейська рада з питань захисту даних описує права суб'єктів даних згідно з GDPR як включаючи право на інформування, доступ, виправлення, стирання, обмеження, переносимість, заперечення та права, пов'язані з автоматизованим прийняттям рішень.",
        "Щоб скористатися своїми правами, зв'яжіться з нами за адресою: info@solo-bizz.com",
        "Ми можемо мати потребу перевірити вашу особу перед обробкою запиту.",
      ] },
      { h: "14. Міжнародна обробка даних", body: [
        "SoloBizz може використовувати хмарних провайдерів або постачальників послуг, розташованих у різних країнах.",
        "Якщо персональні дані передаються міжнародно, ми вживемо розумних заходів, щоб забезпечити використання відповідних гарантій там, де цього вимагає застосовне законодавство.",
      ] },
      { h: "15. Конфіденційність дітей", body: [
        "SoloBizz призначений для професійного та бізнес-використання.",
        "SoloBizz не призначений для використання дітьми. Ми свідомо не збираємо персональні дані від дітей.",
        "Якщо ми дізнаємося, що дитина надала персональні дані без належного дозволу, ми можемо видалити таку інформацію.",
      ] },
      { h: "16. Автоматизоване прийняття рішень", body: [
        "SoloBizz не використовує персональні дані для прийняття юридично значущих рішень щодо користувачів виключно на основі автоматизованої обробки.",
        "Ми можемо використовувати автоматизовані системи для операційних цілей, таких як моніторинг безпеки, запобігання шахрайству, управління статусом підписки, аналітика або покращення продуктивності продукту.",
      ] },
      { h: "17. Зміни до цієї Політики конфіденційності", body: [
        "Ми можемо час від часу оновлювати цю Політику конфіденційності.",
        "Зареєстровані користувачі будуть повідомлені про суттєві зміни електронною поштою, сповіщенням у додатку або іншим розумним способом.",
        "Оновлена версія буде опублікована зі зміненою датою \"Останнє оновлення\".",
        "Продовження використання SoloBizz після набрання чинності змін означає, що ви приймаєте оновлену Політику конфіденційності.",
      ] },
      { h: "18. Контакт", body: [
        "Якщо у вас є запитання щодо цієї Політики конфіденційності або ви хочете подати запит, пов'язаний з даними, зв'яжіться з нами за адресою: info@solo-bizz.com",
      ] },
    ],
  },
};

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part === "info@solo-bizz.com") {
      return (
        <a key={i} href="mailto:info@solo-bizz.com" className="text-primary hover:underline">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const content = CONTENT[lang] ?? CONTENT.en;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> {content.back}
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">{content.title}</h1>
        <p className="text-sm text-muted-foreground mb-10">{content.updated}</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          {content.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-xl font-semibold text-foreground">{section.h}</h2>
              {section.body.map((block, bIdx) => {
                if (Array.isArray(block)) {
                  return (
                    <ul key={bIdx} className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                      {block.map((item, iIdx) => (
                        <li key={iIdx}>{renderInline(item)}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={bIdx} className="text-muted-foreground leading-relaxed mt-2">
                    {renderInline(block)}
                  </p>
                );
              })}
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
