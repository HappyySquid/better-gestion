export interface Appartement {
  id?: string;
  numero: string; // Ex: "A12", "B5", etc.
  batiment?: string; // Optionnel: "Cimes" ou "Vallon"
  dateCreation: Date;
}

