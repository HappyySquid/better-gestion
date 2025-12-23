export interface ProduitBoulangerie {
  id: string;
  nom: string;
  prix: number;
}

export interface CommandeBoulangerie {
  id?: string;
  numAppartement: string;
  nomClient?: string; // Optionnel, peut être dérivé de numAppartement
  produits: {
    produitId: string;
    quantite: number;
  }[];
  dateCommande: Date; // Date pour laquelle la commande est prévue (toujours au moins le lendemain)
  paye: boolean;
  moyenPaiement?: string; // Espèces, Carte bancaire, Chèque, etc.
  donneAuClient: boolean; // Marqué comme donné quand distribué
  dateCreation: Date; // Date de création de la commande
  total: number; // Montant total de la commande
}

export const PRODUITS_BOULANGERIE: ProduitBoulangerie[] = [
  { id: 'champsaurine', nom: 'Champsaurine', prix: 1.50 },
  { id: 'flute-ancienne', nom: 'Flute à l\'ancienne', prix: 1.90 },
  { id: 'pain-cereales', nom: 'Pain aux céréales', prix: 4.00 },
  { id: 'croissant', nom: 'Croissant', prix: 1.50 },
  { id: 'pain-chocolat', nom: 'Pain au chocolat', prix: 1.50 }
];

