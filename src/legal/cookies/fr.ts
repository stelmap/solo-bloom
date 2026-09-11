import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

export const cookiesFr: LegalDoc = {
  back: "Retour à l'accueil",
  title: "Politique de cookies",
  updated: LEGAL_LAST_UPDATED.fr,
  intro:
    "Cette Politique explique quels cookies et technologies similaires Solo .Bizz utilise réellement, à quoi ils servent et comment les contrôler.",
  sections: [
    {
      h: "1. Cookies et technologies similaires",
      body: [
        "Les cookies sont de petits fichiers enregistrés par votre navigateur. Les technologies similaires incluent le stockage local, qui conserve des informations sans les transmettre à chaque requête.",
        "Certains sont nécessaires au fonctionnement du site et de l'application. Les autres sont facultatifs et ne sont utilisés qu'avec votre consentement.",
      ],
    },
    {
      h: "2. Cookies et stockage utilisés",
      body: [
        {
          type: "table",
          headers: ["Nom", "Fournisseur", "Finalité", "Catégorie", "Durée", "Origine"],
          rows: [
            [
              "sb-*-auth-token",
              "Solo .Bizz (Lovable Cloud)",
              "Maintient votre connexion et votre session",
              "Nécessaire",
              "Jusqu'à la déconnexion ou l'expiration",
              "Interne",
            ],
            [
              "cookie_consent_v1",
              "Solo .Bizz",
              "Conserve vos choix en matière de cookies",
              "Nécessaire",
              "Jusqu'à effacement ou modification du choix",
              "Interne",
            ],
            [
              "app_lang / landing_lang / pre_login_lang",
              "Solo .Bizz",
              "Mémorise la langue d'interface choisie",
              "Nécessaire",
              "Jusqu'à effacement du stockage du navigateur",
              "Interne",
            ],
            [
              "ph_* (PostHog)",
              "PostHog (UE)",
              "Analyse produit : fonctionnalités et pages utilisées",
              "Analytique",
              "Jusqu'à 12 mois",
              "Interne",
            ],
            [
              "Cookies et stockage Plerdy",
              "Plerdy",
              "Analyse d'usage du site et cartes de chaleur",
              "Analytique",
              "Selon le paramétrage du fournisseur",
              "Tiers",
            ],
            [
              "_fbp et identifiants Meta Pixel associés",
              "Meta",
              "Mesure publicitaire et attribution des campagnes",
              "Marketing",
              "Jusqu'à 90 jours",
              "Tiers",
            ],
            [
              "Cookies Stripe",
              "Stripe",
              "Traitement des paiements et prévention de la fraude",
              "Nécessaire",
              "Selon le paramétrage du fournisseur",
              "Tiers",
            ],
          ],
        },
        "Les cookies et stockages nécessaires sont toujours actifs, le service ne pouvant fonctionner sans eux. Les technologies analytiques et marketing ne sont chargées qu'après acceptation de la catégorie correspondante.",
      ],
    },
    {
      h: "3. Votre consentement",
      body: [
        "Lors de votre première visite, une bannière de consentement propose de manière équivalente : tout accepter, tout refuser sauf le nécessaire, ou gérer vos préférences par catégorie.",
        "Aucune technologie analytique ou marketing n'est chargée avant votre consentement. Votre choix est mémorisé sur cet appareil et appliqué lors des visites suivantes.",
      ],
    },
    {
      h: "4. Modifier ou retirer votre consentement",
      body: [
        "Vous pouvez modifier ou retirer votre consentement à tout moment via le lien **Paramètres des cookies** dans le pied de page. Après retrait, les technologies concernées ne sont plus chargées.",
        "Vous pouvez aussi supprimer les cookies et données du site dans les réglages de votre navigateur. Bloquer les cookies nécessaires peut empêcher une partie du service de fonctionner.",
      ],
    },
    {
      h: "5. Modifications de cette politique",
      body: [
        "Si nous ajoutons ou retirons une technologie, cette politique et le tableau ci-dessus sont mis à jour. La date en haut indique la version en vigueur.",
      ],
    },
    {
      h: "6. Contact et documents liés",
      body: [
        "Questions sur les cookies : info@solo-bizz.com.",
        { type: "link", to: "/privacy", label: "Politique de confidentialité" },
        { type: "link", to: "/terms", label: "Conditions générales" },
      ],
    },
  ],
};
