import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

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
    canActivate: [authGuard, roleGuard('reception')]
  },
  {
    path: 'parking',
    loadComponent: () => import('./parking/parking.component').then(m => m.ParkingComponent),
    canActivate: [authGuard, roleGuard('reception')]
  },
  {
    path: 'parking/:batiment',
    loadComponent: () => import('./parking/parking-detail/parking-detail.component').then(m => m.ParkingDetailComponent),
    canActivate: [authGuard, roleGuard('reception')]
  },
  {
    path: 'boulangerie',
    loadComponent: () => import('./boulangerie/boulangerie.component').then(m => m.BoulangerieComponent),
    canActivate: [authGuard, roleGuard('reception')]
  },
  {
    path: 'gestion-menage',
    loadComponent: () => import('./gestion-menage/gestion-menage.component').then(m => m.GestionMenageComponent),
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
