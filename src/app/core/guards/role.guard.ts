import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserRoleService, UserRole } from '../services/user-role.service';
import { map, take } from 'rxjs/operators';

/**
 * Guard pour protéger les routes selon le rôle de l'utilisateur
 * Le rôle réception a accès à tout, le rôle ménage uniquement à la gestion ménage
 */
export const roleGuard = (requiredRole: UserRole): CanActivateFn => {
  return (route, state) => {
    const userRoleService = inject(UserRoleService);
    const router = inject(Router);

    return userRoleService.getUserRole().pipe(
      take(1),
      map(userRole => {
        if (!userRole) {
          router.navigate(['/dashboard']);
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
        
        // Si le rôle requis est ménage, seul le rôle ménage ou réception peut y accéder
        if (requiredRole === 'menage') {
          return userRole === 'menage' || userRole === 'reception';
        }
        
        // Pour les autres routes (reception), seul le rôle réception peut y accéder
        router.navigate(['/dashboard']);
        return false;
      })
    );
  };
};

