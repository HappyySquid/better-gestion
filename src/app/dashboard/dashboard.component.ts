import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { UserRoleService, UserRole } from '../core/services/user-role.service';
import { AppartementService } from '../core/services/appartement.service';
import { ToastService } from '../shared/services/toast.service';
import { Appartement } from '../core/models/appartement.model';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private userRoleService = inject(UserRoleService);
  private appartementService = inject(AppartementService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  user$ = this.authService.user$;
  userRole$: Observable<UserRole | null> = this.userRoleService.getUserRole();
  
  // Vérifier si l'utilisateur a le rôle réception (accès à tout)
  isReception$: Observable<boolean> = this.userRole$.pipe(
    map(role => role === 'reception')
  );
  
  // Vérifier si l'utilisateur a le rôle ménage
  isMenage$: Observable<boolean> = this.userRole$.pipe(
    map(role => role === 'menage')
  );

  // Gestion des appartements (temporaire)
  appartements: Appartement[] = [];
  showAppartementForm: boolean = false;
  isLoadingAppartements: boolean = false;
  appartementForm: FormGroup;

  constructor() {
    this.appartementForm = this.fb.group({
      numero: ['', [Validators.required]],
      batiment: ['']
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadAppartements();
  }

  async loadAppartements(): Promise<void> {
    this.isLoadingAppartements = true;
    try {
      this.appartementService.getAllAppartements().subscribe({
        next: (appartements) => {
          this.appartements = appartements;
          this.isLoadingAppartements = false;
        },
        error: () => {
          this.appartements = [];
          this.isLoadingAppartements = false;
        }
      });
    } catch (error) {
      this.appartements = [];
      this.isLoadingAppartements = false;
    }
  }

  async addAppartement(): Promise<void> {
    if (this.appartementForm.invalid) {
      this.appartementForm.markAllAsTouched();
      this.toastService.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const formValue = this.appartementForm.value;
    try {
      await this.appartementService.addAppartement({
        numero: formValue.numero.trim().toUpperCase(),
        batiment: formValue.batiment?.trim() || undefined
      });
      this.toastService.success('Appartement ajouté avec succès');
      this.appartementForm.reset();
      this.showAppartementForm = false;
      await this.loadAppartements();
    } catch (error: any) {
      this.toastService.error(error.message || 'Erreur lors de l\'ajout de l\'appartement');
    }
  }

  async deleteAppartement(appartement: Appartement): Promise<void> {
    if (!appartement.id) {
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'appartement ${appartement.numero} ?`)) {
      return;
    }

    try {
      await this.appartementService.deleteAppartement(appartement.id);
      this.toastService.success('Appartement supprimé avec succès');
      await this.loadAppartements();
    } catch (error: any) {
      this.toastService.error(error.message || 'Erreur lors de la suppression de l\'appartement');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }
}
