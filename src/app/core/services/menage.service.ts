import { Injectable, inject, runInInjectionContext, Injector } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, orderBy, Timestamp } from '@angular/fire/firestore';
import { AppartementMenage, StatutMenage } from '../models/menage.model';
import { Observable, from, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MenageService {
  private firestore: Firestore = inject(Firestore);
  private injector = inject(Injector);
  private readonly COLLECTION_NAME = 'menage';

  /**
   * Récupère tous les statuts de ménage
   */
  getAllStatuts(): Observable<AppartementMenage[]> {
    return new Observable(observer => {
      runInInjectionContext(this.injector, () => {
        const menageCollection = collection(this.firestore, this.COLLECTION_NAME);
        const q = query(menageCollection, orderBy('numero'));
        
        getDocs(q).then((querySnapshot) => {
          const statuts: AppartementMenage[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const dateModif = data['dateModification'];
            return {
              id: doc.id,
              numero: data['numero'] || '',
              batiment: data['batiment'] || undefined,
              statut: data['statut'] || 'sale',
              dateModification: dateModif instanceof Timestamp 
                ? dateModif.toDate() 
                : (dateModif?.toDate ? dateModif.toDate() : new Date())
            } as AppartementMenage;
          });
          observer.next(statuts);
          observer.complete();
        }).catch(() => {
          observer.next([]);
          observer.complete();
        });
      });
    });
  }

  /**
   * Récupère le statut d'un appartement par son numéro
   */
  getStatutByNumero(numero: string): Observable<AppartementMenage | null> {
    return new Observable(observer => {
      runInInjectionContext(this.injector, () => {
        const menageCollection = collection(this.firestore, this.COLLECTION_NAME);
        const q = query(menageCollection, where('numero', '==', numero.trim().toUpperCase()));
        
        getDocs(q).then((querySnapshot) => {
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            const dateModif = data['dateModification'];
            observer.next({
              id: doc.id,
              numero: data['numero'] || '',
              batiment: data['batiment'] || undefined,
              statut: data['statut'] || 'sale',
              dateModification: dateModif instanceof Timestamp 
                ? dateModif.toDate() 
                : (dateModif?.toDate ? dateModif.toDate() : new Date())
            } as AppartementMenage);
          } else {
            observer.next(null);
          }
          observer.complete();
        }).catch(() => {
          observer.next(null);
          observer.complete();
        });
      });
    });
  }

  /**
   * Met à jour ou crée le statut d'un appartement
   */
  async updateStatut(numero: string, statut: StatutMenage, batiment?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      runInInjectionContext(this.injector, () => {
        const menageCollection = collection(this.firestore, this.COLLECTION_NAME);
        const q = query(menageCollection, where('numero', '==', numero.trim().toUpperCase()));
        
        getDocs(q).then(async (querySnapshot) => {
          const statutData = {
            numero: numero.trim().toUpperCase(),
            batiment: batiment || null,
            statut: statut,
            dateModification: Timestamp.fromDate(new Date())
          };

          if (!querySnapshot.empty) {
            // Mettre à jour l'existant
            const docRef = doc(this.firestore, this.COLLECTION_NAME, querySnapshot.docs[0].id);
            await setDoc(docRef, statutData, { merge: true });
          } else {
            // Créer un nouveau document
            await addDoc(menageCollection, statutData);
          }
          resolve();
        }).catch((error) => {
          reject(error);
        });
      });
    });
  }
}

