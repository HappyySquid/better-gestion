import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./auth/components/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/components/login/login.component').then(m => m.LoginComponent),
        canActivate: [loginGuard]
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'gestion-linge',
    loadComponent: () => import('./gestion-linge/gestion-linge.component').then(m => m.GestionLingeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'parking',
    loadComponent: () => import('./parking/parking.component').then(m => m.ParkingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'parking/:batiment',
    loadComponent: () => import('./parking/parking-detail/parking-detail.component').then(m => m.ParkingDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'boulangerie',
    loadComponent: () => import('./boulangerie/boulangerie.component').then(m => m.BoulangerieComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
