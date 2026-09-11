import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

export const termsFr: LegalDoc = {
  back: "Retour à l'accueil",
  title: "Conditions générales",
  updated: LEGAL_LAST_UPDATED.fr,
  intro:
    "Ces Conditions générales régissent l'utilisation du site et de l'application Solo .Bizz. Merci de les lire avant de créer un compte.",
  sections: [
    {
      h: "1. Qui fournit le service",
      body: [
        "Solo .Bizz est exploité par l'exploitant de Solo .Bizz, joignable à info@solo-bizz.com.",
        "**Précision :** les informations complètes sur l'entité juridique seront publiées ici après confirmation officielle.",
        "En créant un compte ou en utilisant Solo .Bizz, vous acceptez ces Conditions. Si vous ne les acceptez pas, n'utilisez pas le service.",
      ],
    },
    {
      h: "2. Qu'est-ce que Solo .Bizz",
      body: [
        "Solo .Bizz est un logiciel qui aide les professionnels indépendants à gérer leur pratique. Selon la formule, il peut inclure :",
        [
          "les dossiers clients et l'historique de la pratique ;",
          "l'agenda et la planification des séances, y compris les pages de réservation publiques ;",
          "les notes de séance et documents ;",
          "les accords et le recueil de consentements ;",
          "le suivi des paiements et la vue financière ;",
          "les notifications et rappels ;",
          "les rapports et analyses de votre propre pratique.",
        ],
        "Solo .Bizz est un outil d'organisation. Il ne fournit pas de services psychologiques, médicaux, juridiques, comptables ou fiscaux et ne supervise pas votre travail professionnel.",
      ],
    },
    {
      h: "3. Comptes et conditions d'accès",
      body: [
        "Vous devez avoir au moins 18 ans et être capable de contracter.",
        [
          "fournissez des informations d'inscription exactes et tenez-les à jour ;",
          "vous êtes responsable de la confidentialité de vos identifiants ;",
          "vous êtes responsable des activités réalisées depuis votre compte ;",
          "un compte est destiné à un professionnel, sauf si la formule autorise expressément plusieurs utilisateurs ;",
          "informez-nous rapidement de tout soupçon d'utilisation non autorisée.",
        ],
        "Nous pouvons suspendre ou fermer les comptes utilisés en violation de ces Conditions.",
      ],
    },
    {
      h: "4. Votre responsabilité professionnelle",
      body: [
        "Vous restez pleinement responsable de votre pratique : qualité et légalité de vos prestations, qualifications et autorisations, obligations professionnelles et déontologiques, relation avec vos clients, obligations fiscales et comptables.",
        "Solo .Bizz est un outil que vous utilisez dans votre pratique, et non une partie à votre relation avec vos clients.",
      ],
    },
    {
      h: "5. Formules et tarifs",
      body: [
        "Solo .Bizz propose une formule gratuite et des abonnements payants. Les formules diffèrent principalement par le nombre de clients actifs et les fonctionnalités incluses.",
        "Les formules, tarifs, périodicités, devises et remises en vigueur sont affichés dans la section tarifs du site et dans l'application avant la confirmation de l'achat. Les prix peuvent évoluer ; le prix affiché au moment de l'achat s'applique au cycle de facturation concerné.",
        { type: "link", to: "/#pricing", label: "Voir les formules et tarifs actuels" },
      ],
    },
    {
      h: "6. Abonnements, paiements et renouvellement",
      body: [
        "Les formules payantes sont des abonnements récurrents traités par notre prestataire de paiement Stripe.",
        [
          "le paiement s'effectue via Stripe Checkout et un moyen de paiement est enregistré lors de l'achat ;",
          "l'abonnement se renouvelle automatiquement à la fin de chaque période jusqu'à résiliation ;",
          "le renouvellement est prélevé sur le moyen de paiement enregistré ;",
          "aucune période d'essai gratuite n'est proposée actuellement — si elle est introduite, sa durée et ses conditions seront indiquées avant l'achat ;",
          "nous ne conservons pas vos données de carte complètes : elles sont gérées par Stripe ;",
          "en cas d'échec de paiement, l'accès aux fonctions payantes peut être limité jusqu'au règlement.",
        ],
        "Vous pouvez gérer ou résilier votre abonnement et mettre à jour votre moyen de paiement depuis le portail de facturation disponible dans votre compte.",
      ],
    },
    {
      h: "7. Résiliation, remboursements et droit de rétractation",
      body: [
        "Vous pouvez résilier un abonnement payant à tout moment. La résiliation arrête les renouvellements futurs ; l'accès payé se poursuit normalement jusqu'à la fin de la période en cours.",
        "Les paiements déjà effectués ne sont en principe pas remboursables, sauf lorsque la loi l'impose ou si nous l'acceptons expressément.",
        "**Consommateurs dans l'UE/EEE :** si vous êtes consommateur, vous pouvez disposer d'un droit légal de rétractation de 14 jours après la conclusion du contrat à distance. Si vous demandez l'exécution immédiate du service numérique pendant ce délai et reconnaissez perdre ce droit une fois le service pleinement fourni, ce droit peut être perdu ou réduit. Pour l'exercer, écrivez à info@solo-bizz.com.",
        "Rien dans ces Conditions ne limite les droits impératifs des consommateurs.",
      ],
    },
    {
      h: "8. Conditions de coopération",
      body: [
        "En complément de ces Conditions, les modalités pratiques suivantes s'appliquent :",
        [
          "le service est fourni sous forme d'abonnement continu, et non de livraison unique ;",
          "l'assistance est assurée par e-mail à info@solo-bizz.com les jours ouvrés ;",
          "nous pouvons publier des mises à jour, nouvelles fonctionnalités et améliorations à tout moment ;",
          "vos données restent les vôtres : vous pouvez les exporter ou en demander la suppression ;",
          "vous êtes responsable de la configuration du produit pour votre pratique : pages de réservation, tarifs, accords, notifications ;",
          "la communication se fait principalement par e-mail et via les messages dans l'application.",
        ],
      ],
    },
    {
      h: "9. Utilisation acceptable",
      body: [
        "Vous vous engagez à ne pas :",
        [
          "utiliser Solo .Bizz à des fins illicites ou en violation des règles professionnelles ;",
          "téléverser du code malveillant ou perturber le service ;",
          "tenter d'accéder sans autorisation à d'autres comptes ou à nos systèmes ;",
          "faire de l'ingénierie inverse, copier ou revendre le service sans notre accord écrit ;",
          "utiliser le service pour du spam ou des communications illicites ;",
          "stocker des données que vous n'avez pas le droit de traiter.",
        ],
      ],
    },
    {
      h: "10. Données de vos clients",
      body: [
        "Vous décidez des informations relatives à vos clients que vous saisissez dans Solo .Bizz. Vous êtes responsable de disposer d'une base légale valable et d'informer vos clients lorsque cela est requis.",
        "Nous traitons ces données pour fournir le service, conformément à notre Politique de confidentialité.",
        { type: "link", to: "/privacy", label: "Politique de confidentialité" },
      ],
    },
    {
      h: "11. Propriété intellectuelle",
      body: [
        "Le logiciel, la marque, le design et les contenus de Solo .Bizz appartiennent à l'exploitant de Solo .Bizz et sont protégés par le droit de la propriété intellectuelle. Vous recevez un droit d'utilisation limité, non exclusif et non transférable pendant la durée de votre abonnement.",
        "Les contenus que vous créez ou téléversez restent les vôtres. Vous nous accordez uniquement les droits nécessaires pour les héberger, les traiter et les afficher afin de fournir le service.",
      ],
    },
    {
      h: "12. Disponibilité et évolutions du service",
      body: [
        "Nous nous efforçons de maintenir Solo .Bizz disponible et fiable, sans garantir une disponibilité ininterrompue. La maintenance, les mises à jour ou des incidents chez nos prestataires peuvent provoquer des interruptions temporaires.",
        "Nous pouvons ajouter, modifier ou supprimer des fonctionnalités. Si nous supprimons une fonctionnalité payante importante, nous en informerons dans un délai raisonnable lorsque cela est possible, et vous pourrez résilier votre abonnement.",
      ],
    },
    {
      h: "13. Responsabilité",
      body: [
        "Le service est fourni « en l'état » et « selon disponibilité », dans les limites autorisées par la loi.",
        "Nous ne sommes pas responsables des dommages indirects ou consécutifs, des pertes de bénéfices, de clients ou de données au-delà de ce que prévoit la loi. Dans la mesure permise par la loi, notre responsabilité totale est limitée au montant payé pour le service au cours des douze mois précédant le fait générateur.",
        "Rien n'exclut la responsabilité qui ne peut l'être légalement, notamment en cas de faute intentionnelle, de négligence grave ou de dommage corporel, ni les droits impératifs des consommateurs.",
      ],
    },
    {
      h: "14. Résiliation du compte",
      body: [
        "Vous pouvez cesser d'utiliser le service et supprimer votre compte à tout moment.",
        "Nous pouvons suspendre ou résilier l'accès en cas de manquement grave à ces Conditions, si la loi l'exige, ou si l'usage met en danger le service ou d'autres utilisateurs. Lorsque cela est raisonnable, nous vous en informerons au préalable.",
        "Après résiliation, vos données sont supprimées ou anonymisées comme décrit dans la Politique de confidentialité.",
      ],
    },
    {
      h: "15. Services tiers",
      body: [
        "Solo .Bizz s'appuie sur des prestataires tiers : infrastructure cloud, Stripe pour les paiements, notre prestataire d'envoi d'e-mails, des services d'analyse et — si vous les utilisez — la connexion Google et les notifications Telegram.",
        "Leurs propres conditions s'appliquent à leurs services et nous ne répondons pas de leurs actes ou omissions indépendants.",
      ],
    },
    {
      h: "16. Droit applicable et litiges",
      body: [
        "Ces Conditions sont régies par le droit du lieu d'établissement de l'exploitant de Solo .Bizz, sans préjudice des règles impératives de protection des consommateurs de votre pays de résidence.",
        "**Précision :** le droit applicable et les tribunaux compétents seront indiqués ici une fois les informations légales de l'exploitant confirmées. Les consommateurs peuvent aussi recourir à la plateforme de règlement en ligne des litiges de la Commission européenne.",
        "Nous cherchons toujours d'abord une solution directe — écrivez à info@solo-bizz.com.",
      ],
    },
    {
      h: "17. Modifications des Conditions",
      body: [
        "Nous pouvons mettre à jour ces Conditions au fil de l'évolution du produit et de la réglementation. La date en haut indique la version en vigueur.",
        "En cas de modification substantielle, nous informerons les utilisateurs enregistrés par e-mail ou dans l'application avant son entrée en vigueur. Continuer à utiliser le service vaut acceptation des Conditions mises à jour.",
      ],
    },
    {
      h: "18. Contact",
      body: ["Questions sur ces Conditions : info@solo-bizz.com."],
    },
  ],
};
