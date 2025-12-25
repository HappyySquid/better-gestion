export type StatutMenage = 'sale' | 'propre' | 'verifie';

export interface AppartementMenage {
  id?: string;
  numero: string;
  batiment?: string;
  statut: StatutMenage;
  dateModification: Date;
}

