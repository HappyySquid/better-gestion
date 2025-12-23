import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showInstallButton: boolean = false;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Écouter l'événement beforeinstallprompt pour détecter si l'app peut être installée
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    
    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.showInstallButton = false;
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
  }

  private handleBeforeInstallPrompt = (e: Event) => {
    // Empêcher l'affichage automatique du prompt
    e.preventDefault();
    // Stocker l'événement pour l'utiliser plus tard
    this.deferredPrompt = e as BeforeInstallPromptEvent;
    this.showInstallButton = true;
  };

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) {
      return;
    }

    // Afficher le prompt d'installation
    this.deferredPrompt.prompt();
    
    // Attendre la réponse de l'utilisateur
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('L\'utilisateur a accepté l\'installation');
    } else {
      console.log('L\'utilisateur a refusé l\'installation');
    }
    
    // Réinitialiser
    this.deferredPrompt = null;
    this.showInstallButton = false;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const { email, password } = this.loginForm.value;
        await this.authService.login(email, password);
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.errorMessage = error.message || 'Une erreur est survenue lors de la connexion';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}
