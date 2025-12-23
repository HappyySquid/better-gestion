import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, query, where, getDocs, Timestamp } from '@angular/fire/firestore';
import { ParkingClient, Batiment, ParkingStats, BatimentParking } from '../models/parking.model';

@Injectable({
  providedIn: 'root'
})
export class ParkingService {
  private firestore: Firestore = inject(Firestore);
  private readonly TOTAL_PLACES_CIMES = 50; // À ajuster selon vos besoins
  private readonly TOTAL_PLACES_VALLON = 50; // À ajuster selon vos besoins

  /**
   * Récupère tous les clients d'un bâtiment
   */
  async getClientsByBatiment(batiment: Batiment): Promise<ParkingClient[]> {
    const clientsCollection = collection(this.firestore, 'parking-clients');
    const q = query(clientsCollection, where('batiment', '==', batiment));
    const querySnapshot = await getDocs(q);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      const dateDebut = data['dateDebut']?.toDate ? data['dateDebut'].toDate() : new Date(data['dateDebut']);
      const dateDebutOnly = new Date(dateDebut);
      dateDebutOnly.setHours(0, 0, 0, 0);
      const estReservation = dateDebutOnly > today;
      
      return {
        id: doc.id,
        ...data,
        dateDebut: dateDebut,
        dateFin: data['dateFin']?.toDate ? data['dateFin'].toDate() : new Date(data['dateFin']),
        estReservation: estReservation,
        confirme: data['confirme'] || false
      } as ParkingClient;
    });
  }

  /**
   * Ajoute un nouveau client
   */
  async addClient(client: Omit<ParkingClient, 'id' | 'estReservation'>): Promise<string> {
    const clientsCollection = collection(this.firestore, 'parking-clients');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateDebutOnly = new Date(client.dateDebut);
    dateDebutOnly.setHours(0, 0, 0, 0);
    const estReservation = dateDebutOnly > today;
    
    // Nettoyer les données pour Firestore (pas de null ou undefined)
    const clientData: any = {
      nom: client.nom,
      plaqueImmatriculation: client.plaqueImmatriculation || '',
      modeleVehicule: client.modeleVehicule || '',
      dateDebut: Timestamp.fromDate(client.dateDebut),
      dateFin: Timestamp.fromDate(client.dateFin),
      batiment: client.batiment,
      estReservation: estReservation,
      paye: estReservation ? false : (client.paye || false)
    };

    // Ajouter les champs optionnels seulement s'ils existent
    if (client.numAppartement && client.numAppartement.trim() !== '') {
      clientData.numAppartement = client.numAppartement;
    }

    if (estReservation) {
      clientData.confirme = false;
    }
    
    const docRef = await addDoc(clientsCollection, clientData);
    return docRef.id;
  }

  /**
   * Supprime un client
   */
  async removeClient(clientId: string): Promise<void> {
    const clientDoc = doc(this.firestore, 'parking-clients', clientId);
    await deleteDoc(clientDoc);
  }

  /**
   * Met à jour un client
   */
  async updateClient(clientId: string, updates: Partial<ParkingClient>): Promise<void> {
    const clientDoc = doc(this.firestore, 'parking-clients', clientId);
    const updateData: any = { ...updates };
    
    if (updates.dateDebut) {
      updateData.dateDebut = Timestamp.fromDate(updates.dateDebut);
    }
    if (updates.dateFin !== undefined) {
      updateData.dateFin = updates.dateFin ? Timestamp.fromDate(updates.dateFin) : null;
    }
    
    // Nettoyer les valeurs undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(clientDoc, updateData);
  }

  /**
   * Calcule les statistiques d'un bâtiment pour une date donnée
   */
  async getParkingStats(batiment: Batiment, date: Date = new Date()): Promise<ParkingStats> {
    const clients = await this.getClientsByBatiment(batiment);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Filtrer les clients présents à la date donnée
    const clientsPresents = clients.filter(c => {
      const dateDebut = new Date(c.dateDebut);
      dateDebut.setHours(0, 0, 0, 0);
      const dateFin = c.dateFin ? new Date(c.dateFin) : null;
      if (dateFin) {
        dateFin.setHours(0, 0, 0, 0);
      }
      
      // Client présent si dateDebut <= date sélectionnée <= dateFin (ou pas de dateFin)
      return dateDebut <= dateOnly && (!dateFin || dateFin >= dateOnly);
    });
    
    const totalPlaces = batiment === 'Cimes' ? this.TOTAL_PLACES_CIMES : this.TOTAL_PLACES_VALLON;
    const placesUtilisees = clientsPresents.length;
    const placesRestantes = Math.max(0, totalPlaces - placesUtilisees);
    const pourcentageUtilise = totalPlaces > 0 ? Math.round((placesUtilisees / totalPlaces) * 100) : 0;

    return {
      totalPlaces,
      placesUtilisees,
      placesRestantes,
      pourcentageUtilise
    };
  }

  /**
   * Confirme une réservation (la transforme en client présent)
   */
  async confirmerReservation(clientId: string, plaqueImmatriculation?: string, modeleVehicule?: string): Promise<void> {
    const clientDoc = doc(this.firestore, 'parking-clients', clientId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const updateData: any = {
      confirme: true,
      estReservation: false,
      dateDebut: Timestamp.fromDate(today)
    };

    // Ajouter plaque ou modèle si fournis
    if (plaqueImmatriculation && plaqueImmatriculation.trim() !== '') {
      updateData.plaqueImmatriculation = plaqueImmatriculation.trim();
    }
    if (modeleVehicule && modeleVehicule.trim() !== '') {
      updateData.modeleVehicule = modeleVehicule.trim();
    }

    await updateDoc(clientDoc, updateData);
  }

  /**
   * Annule une réservation
   */
  async annulerReservation(clientId: string): Promise<void> {
    await this.removeClient(clientId);
  }

  /**
   * Récupère les statistiques des deux bâtiments pour une date donnée
   */
  async getAllStats(date: Date = new Date()): Promise<{ cimes: ParkingStats; vallon: ParkingStats }> {
    const [cimes, vallon] = await Promise.all([
      this.getParkingStats('Cimes', date),
      this.getParkingStats('Vallon', date)
    ]);

    return { cimes, vallon };
  }

  /**
   * Recherche des clients par plaque d'immatriculation
   */
  async searchClientsByPlaque(batiment: Batiment, plaque: string): Promise<ParkingClient[]> {
    const clients = await this.getClientsByBatiment(batiment);
    const searchTerm = plaque.toLowerCase().trim();
    
    if (!searchTerm) {
      return clients;
    }

    return clients.filter(client => 
      client.plaqueImmatriculation.toLowerCase().includes(searchTerm)
    );
  }
}

