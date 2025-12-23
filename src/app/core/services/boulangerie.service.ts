import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, Timestamp, orderBy } from '@angular/fire/firestore';
import { CommandeBoulangerie, PRODUITS_BOULANGERIE } from '../models/boulangerie.model';

@Injectable({
  providedIn: 'root'
})
export class BoulangerieService {
  private firestore: Firestore = inject(Firestore);
  private readonly COLLECTION_NAME = 'boulangerie-commandes';

  /**
   * Récupère toutes les commandes
   */
  async getAllCommandes(): Promise<CommandeBoulangerie[]> {
    try {
      const commandesCollection = collection(this.firestore, this.COLLECTION_NAME);
      // Récupérer toutes les commandes sans orderBy pour éviter les problèmes d'index
      const querySnapshot = await getDocs(commandesCollection);
      
      if (querySnapshot.empty) {
        console.log('Aucune commande trouvée dans Firestore');
        return [];
      }
      
      console.log(`Nombre de documents récupérés: ${querySnapshot.docs.length}`);
      
      const commandes = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let dateCommande: Date;
        let dateCreation: Date;
        
        // Conversion sécurisée des dates
        if (data['dateCommande']?.toDate) {
          dateCommande = data['dateCommande'].toDate();
        } else if (data['dateCommande']) {
          dateCommande = new Date(data['dateCommande']);
        } else {
          dateCommande = new Date();
        }
        
        if (data['dateCreation']?.toDate) {
          dateCreation = data['dateCreation'].toDate();
        } else if (data['dateCreation']) {
          dateCreation = new Date(data['dateCreation']);
        } else {
          dateCreation = new Date();
        }
        
        const commande = {
          id: doc.id,
          numAppartement: data['numAppartement'] || '',
          nomClient: data['nomClient'] || undefined, // Optionnel, pour compatibilité
          produits: data['produits'] || [],
          dateCommande: dateCommande,
          dateCreation: dateCreation,
          paye: data['paye'] || false,
          moyenPaiement: data['moyenPaiement'] || undefined,
          donneAuClient: data['donneAuClient'] || false,
          total: data['total'] || 0
        } as CommandeBoulangerie;
        
        console.log('Commande récupérée:', {
          id: commande.id,
          nomClient: commande.nomClient,
          dateCommande: commande.dateCommande.toISOString(),
          produits: commande.produits.length
        });
        
        return commande;
      });
      
      // Trier côté client par dateCommande puis dateCreation
      commandes.sort((a, b) => {
        const dateA = a.dateCommande.getTime();
        const dateB = b.dateCommande.getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        return a.dateCreation.getTime() - b.dateCreation.getTime();
      });
      
      return commandes;
    } catch (error: any) {
      // En cas d'erreur (collection inexistante, index manquant, etc.), retourner un tableau vide
      console.error('Erreur lors de la récupération des commandes:', error);
      return [];
    }
  }

  /**
   * Récupère les commandes pour une date donnée
   */
  async getCommandesByDate(date: Date): Promise<CommandeBoulangerie[]> {
    const commandes = await this.getAllCommandes();
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    return commandes.filter(commande => {
      const commandeDate = new Date(commande.dateCommande);
      commandeDate.setHours(0, 0, 0, 0);
      return commandeDate.getTime() === dateOnly.getTime();
    });
  }

  /**
   * Récupère les commandes du jour (non distribuées)
   */
  async getCommandesDuJour(): Promise<CommandeBoulangerie[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const commandes = await this.getCommandesByDate(today);
    return commandes.filter(c => !c.donneAuClient);
  }

  /**
   * Ajoute une nouvelle commande
   */
  async addCommande(commande: Omit<CommandeBoulangerie, 'id' | 'dateCreation' | 'total'>): Promise<string> {
    const commandesCollection = collection(this.firestore, this.COLLECTION_NAME);
    
    // Calculer le total
    const total = commande.produits.reduce((sum, item) => {
      const produit = PRODUITS_BOULANGERIE.find(p => p.id === item.produitId);
      return sum + (produit ? produit.prix * item.quantite : 0);
    }, 0);
    
    // Nettoyer les données pour Firestore
    const commandeData: any = {
      numAppartement: commande.numAppartement.trim(),
      produits: commande.produits,
      dateCommande: Timestamp.fromDate(commande.dateCommande),
      paye: commande.paye || false,
      donneAuClient: false,
      dateCreation: Timestamp.fromDate(new Date()),
      total: total
    };

    // Ajouter nomClient seulement s'il existe (pour compatibilité avec anciennes données)
    if (commande.nomClient && commande.nomClient.trim() !== '') {
      commandeData.nomClient = commande.nomClient.trim();
    }

    // Ajouter moyenPaiement seulement si payé et si défini
    if (commande.paye && commande.moyenPaiement && commande.moyenPaiement.trim() !== '') {
      commandeData.moyenPaiement = commande.moyenPaiement.trim();
    }
    
    const docRef = await addDoc(commandesCollection, commandeData);
    return docRef.id;
  }

  /**
   * Met à jour une commande
   */
  async updateCommande(commandeId: string, updates: Partial<CommandeBoulangerie>): Promise<void> {
    const commandeDoc = doc(this.firestore, this.COLLECTION_NAME, commandeId);
    const updateData: any = { ...updates };
    
    // Supprimer l'id s'il est présent
    delete updateData.id;
    
    // Convertir les dates en Timestamp si présentes
    if (updates.dateCommande) {
      updateData.dateCommande = Timestamp.fromDate(updates.dateCommande);
    }
    
    // Recalculer le total si les produits changent
    if (updates.produits) {
      const total = updates.produits.reduce((sum, item) => {
        const produit = PRODUITS_BOULANGERIE.find(p => p.id === item.produitId);
        return sum + (produit ? produit.prix * item.quantite : 0);
      }, 0);
      updateData.total = total;
    }
    
    // Nettoyer les valeurs undefined et null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
      // Pour Firestore, on peut garder null pour supprimer un champ
    });
    
    await updateDoc(commandeDoc, updateData);
  }

  /**
   * Marque une commande comme donnée au client
   */
  async marquerCommeDonnee(commandeId: string): Promise<void> {
    await this.updateCommande(commandeId, { donneAuClient: true });
  }

  /**
   * Annule le statut "donné au client"
   */
  async annulerDonnee(commandeId: string): Promise<void> {
    await this.updateCommande(commandeId, { donneAuClient: false });
  }

  /**
   * Marque une commande comme payée
   */
  async marquerCommePayee(commandeId: string, paye: boolean, moyenPaiement?: string): Promise<void> {
    const updates: any = { paye };
    if (paye && moyenPaiement) {
      updates.moyenPaiement = moyenPaiement;
    } else if (!paye) {
      // Supprimer le moyen de paiement si non payé (utiliser FieldValue.delete() pour Firestore)
      updates.moyenPaiement = null;
    }
    await this.updateCommande(commandeId, updates);
  }

  /**
   * Supprime une commande
   */
  async deleteCommande(commandeId: string): Promise<void> {
    const commandeDoc = doc(this.firestore, this.COLLECTION_NAME, commandeId);
    await deleteDoc(commandeDoc);
  }
}

