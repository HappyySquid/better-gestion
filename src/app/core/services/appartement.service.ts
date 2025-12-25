import { Injectable, inject, runInInjectionContext, Injector } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, where, orderBy } from '@angular/fire/firestore';
import { Appartement } from '../models/appartement.model';
import { Observable, from, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppartementService {
  private firestore: Firestore = inject(Firestore);
  private injector = inject(Injector);
  private readonly COLLECTION_NAME = 'appartements';

  /**
   * Vérifie si un appartement existe par son numéro
   */
  appartementExists(numero: string): Observable<boolean> {
    return new Observable(observer => {
      runInInjectionContext(this.injector, () => {
        const appartementsCollection = collection(this.firestore, this.COLLECTION_NAME);
        const q = query(appartementsCollection, where('numero', '==', numero.trim().toUpperCase()));
        
        getDocs(q).then((querySnapshot) => {
          observer.next(!querySnapshot.empty);
          observer.complete();
        }).catch(() => {
          observer.next(false);
          observer.complete();
        });
      });
    });
  }

  /**
   * Récupère tous les appartements
   */
  getAllAppartements(): Observable<Appartement[]> {
    return new Observable(observer => {
      runInInjectionContext(this.injector, () => {
        const appartementsCollection = collection(this.firestore, this.COLLECTION_NAME);
        const q = query(appartementsCollection, orderBy('numero'));
        
        getDocs(q).then((querySnapshot) => {
          const appartements: Appartement[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              numero: data['numero'] || '',
              batiment: data['batiment'] || undefined,
              dateCreation: data['dateCreation']?.toDate() || new Date()
            } as Appartement;
          });
          observer.next(appartements);
          observer.complete();
        }).catch(() => {
          observer.next([]);
          observer.complete();
        });
      });
    });
  }

  /**
   * Ajoute un nouvel appartement
   */
  async addAppartement(appartement: Omit<Appartement, 'id' | 'dateCreation'>): Promise<string> {
    return new Promise((resolve, reject) => {
      runInInjectionContext(this.injector, () => {
        const appartementsCollection = collection(this.firestore, this.COLLECTION_NAME);
        const appartementData = {
          numero: appartement.numero.trim().toUpperCase(),
          batiment: appartement.batiment || null,
          dateCreation: new Date()
        };
        
        addDoc(appartementsCollection, appartementData)
          .then((docRef) => {
            resolve(docRef.id);
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  }

  /**
   * Supprime un appartement
   */
  async deleteAppartement(appartementId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      runInInjectionContext(this.injector, () => {
        const appartementDoc = doc(this.firestore, this.COLLECTION_NAME, appartementId);
        deleteDoc(appartementDoc)
          .then(() => resolve())
          .catch((error) => reject(error));
      });
    });
  }
}

