import type { LegalDoc } from "@/legal/types";
import { LEGAL_LAST_UPDATED } from "@/legal/types";

export const refundFr: LegalDoc = {
  back: "Retour à l'accueil",
  title: "Politique de remboursement",
  updated: LEGAL_LAST_UPDATED.fr,
  intro:
    "Cette politique explique quand vous pouvez annuler un abonnement Solo .Bizz, dans quels cas vous êtes remboursé et comment demander un remboursement.",
  sections: [
    {
      h: "1. À qui vous payez",
      body: [
        "Solo .Bizz est exploité par **l'entrepreneure individuelle Olha Volodymyrivna Stelmakh**, immatriculée à Lviv, Ukraine. Contact : info@solo-bizz.com.",
        "Tous les paiements sont traités par **Paddle.com Market Ltd**, qui agit comme Merchant of Record et revendeur du service. C'est Paddle qui apparaît sur votre relevé bancaire et émet la facture.",
        "Questions sur un paiement ou un remboursement : info@solo-bizz.com.",
      ],
    },
    {
      h: "2. Offre gratuite",
      body: [
        "Solo .Bizz propose une offre gratuite sans carte bancaire. Nous vous conseillons de l'utiliser pour vérifier que le service convient à votre pratique avant de payer.",
      ],
    },
    {
      h: "3. Droit de rétractation de 14 jours (consommateurs UE/EEE et Royaume-Uni)",
      body: [
        "Si vous êtes consommateur dans l'UE/EEE ou au Royaume-Uni, vous pouvez vous rétracter dans les 14 jours suivant le paiement, sans motif : nous remboursons l'intégralité.",
        "Le service démarre immédiatement après le paiement. Même lorsque la loi nous permet de retenir une part correspondant à la période déjà utilisée, nous remboursons en général la totalité.",
      ],
    },
    {
      h: "4. Remboursements après 14 jours",
      body: [
        "L'abonnement se renouvelle automatiquement. Passé 14 jours, le paiement d'une période commencée n'est en principe pas remboursable, car l'accès reste disponible pendant toute la période payée.",
        "Nous remboursons néanmoins, en totalité ou au prorata, dans les cas suivants :",
        [
          "une panne de notre côté a rendu le service inutilisable pendant une durée significative sans que nous puissions la corriger ;",
          "un double prélèvement ou un prélèvement après annulation ;",
          "une offre annuelle ou trimestrielle renouvelée automatiquement, si vous nous contactez dans les 14 jours suivant le prélèvement sans avoir utilisé la nouvelle période ;",
          "tout autre cas où un remboursement est exigé par le droit de la consommation applicable.",
        ],
      ],
    },
    {
      h: "5. Annuler un abonnement",
      body: [
        "Vous pouvez annuler à tout moment depuis les paramètres de l'application ou en écrivant à info@solo-bizz.com.",
        "L'annulation arrête les prélèvements futurs. L'accès payant reste actif jusqu'à la fin de la période déjà payée et vos données restent disponibles jusque-là.",
      ],
    },
    {
      h: "6. Comment demander un remboursement",
      body: [
        "Écrivez à info@solo-bizz.com depuis l'adresse e-mail de votre compte en indiquant la date du paiement, le montant et brièvement le motif. Aucun formulaire particulier n'est requis.",
        "Nous répondons sous 5 jours ouvrés. Les remboursements acceptés sont effectués par Paddle sur le moyen de paiement d'origine, généralement sous 5 à 10 jours ouvrés selon votre banque.",
      ],
    },
    {
      h: "7. Remises et codes promo",
      body: [
        "Le remboursement est calculé sur le montant réellement payé, remise ou code promo appliqué au paiement inclus.",
      ],
    },
    {
      h: "8. Oppositions bancaires (chargeback)",
      body: [
        "Merci de nous contacter avant d'ouvrir un litige auprès de votre banque : presque tout se règle plus vite directement. Les comptes avec un chargeback ouvert peuvent être suspendus jusqu'à sa résolution.",
      ],
    },
    {
      h: "9. Modifications de cette politique",
      body: [
        "Nous pouvons mettre à jour cette politique au fil de l'évolution du produit et des exigences légales. La date en haut indique la version en vigueur ; la politique applicable à votre paiement est celle en vigueur au moment du paiement.",
      ],
    },
    {
      h: "10. Contact",
      body: [
        "Questions sur les remboursements et la facturation : info@solo-bizz.com.",
        { type: "link", to: "/terms", label: "Conditions générales" },
      ],
    },
  ],
};
