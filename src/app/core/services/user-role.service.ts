import { Injectable, inject, runInInjectionContext, Injector } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Observable, map, switchMap, of, catchError, from } from 'rxjs';

export type UserRole = 'reception' | 'menage';

export interface UserRoleData {
  role: UserRole;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserRoleService {
  private firestore: Firestore = inject(Firestore);
  private authService = inject(AuthService);
  private injector = inject(Injector);

  private readonly COLLECTION_NAME = 'userRoles';

  /**
   * Récupère le rôle de l'utilisateur actuel
   */
  getUserRole(): Observable<UserRole | null> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user || !user.email) {
          return of(null);
        }
        return this.getUserRoleByEmail(user.email);
      }),
      catchError(() => {
        return of(null);
      })
    );
  }

  /**
   * Récupère le rôle d'un utilisateur par son email
   */
  getUserRoleByEmail(email: string): Observable<UserRole | null> {
    return new Observable(observer => {
      runInInjectionContext(this.injector, () => {
        const userRoleDoc = doc(this.firestore, this.COLLECTION_NAME, email);
        getDoc(userRoleDoc).then((docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            if (data && data['role']) {
              observer.next(data['role'] as UserRole);
            } else {
              observer.next(null);
            }
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
   * Définit le rôle d'un utilisateur
   */
  async setUserRole(email: string, role: UserRole): Promise<void> {
    const userRoleDoc = doc(this.firestore, this.COLLECTION_NAME, email);
    await setDoc(userRoleDoc, {
      role: role,
      email: email
    }, { merge: true });
  }

  /**
   * Vérifie si l'utilisateur a le rôle spécifié
   */
  hasRole(requiredRole: UserRole): Observable<boolean> {
    return this.getUserRole().pipe(
      map(userRole => {
        if (requiredRole === 'reception') {
          // Le rôle réception a accès à tout
          return userRole === 'reception';
        } else if (requiredRole === 'menage') {
          // Le rôle ménage a accès uniquement à la gestion ménage
          return userRole === 'menage';
        }
        return false;
      })
    );
  }

  /**
   * Vérifie si l'utilisateur a accès à une fonctionnalité
   * Le rôle réception a accès à tout, le rôle ménage uniquement à la gestion ménage
   */
  canAccess(requiredRole: UserRole): Observable<boolean> {
    return this.getUserRole().pipe(
      map(userRole => {
        if (!userRole) {
          return false;
        }
        // Le rôle réception a accès à tout
        if (userRole === 'reception') {
          return true;
        }
        // Le rôle ménage n'a accès qu'à la gestion ménage
        if (userRole === 'menage') {
          return requiredRole === 'menage';
        }
        return false;
      })
    );
  }
}

