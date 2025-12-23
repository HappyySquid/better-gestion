export type Batiment = 'Cimes' | 'Vallon';

export interface ParkingClient {
  id?: string;
  nom: string;
  numAppartement?: string;
  plaqueImmatriculation: string;
  modeleVehicule?: string;
  paye: boolean;
  dateFin: Date;
  dateDebut: Date; // Date de début (peut être future pour les réservations)
  batiment: Batiment;
  estReservation: boolean; // true si dateDebut est dans le futur
  confirme?: boolean; // Pour les réservations confirmées
}

export interface ParkingStats {
  totalPlaces: number;
  placesUtilisees: number;
  placesRestantes: number;
  pourcentageUtilise: number;
}

export interface BatimentParking {
  batiment: Batiment;
  totalPlaces: number;
  clients: ParkingClient[];
}

