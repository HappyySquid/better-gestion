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
    // Vérifier si l'app est déjà installée
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInAppBrowser = (window.navigator as any).standalone === true;
    
    // Ne pas afficher si déjà installée
    if (isStandalone || isInAppBrowser) {
      this.showInstallButton = false;
      return;
    }
    
    // Écouter l'événement beforeinstallprompt pour détecter si l'app peut être installée
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    
    // Afficher le bouton par défaut après un court délai
    // Cela permet d'afficher le bouton même si l'événement n'est pas supporté
    setTimeout(() => {
      // Afficher le bouton si :
      // 1. L'événement beforeinstallprompt a été déclenché (showInstallButton déjà à true)
      // 2. OU si l'app peut être installée (manifest présent, HTTPS, etc.)
      if (!this.showInstallButton) {
        if (this.isPWAInstallable()) {
          this.showInstallButton = true;
        }
      }
    }, 1000);
  }
  
  private isPWAInstallable(): boolean {
    // Vérifier si le manifest existe
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      return false;
    }
    
    // Vérifier si on est en HTTPS ou localhost
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    
    return isSecure;
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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Si on a l'événement deferredPrompt, l'utiliser
    if (this.deferredPrompt) {
      try {
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
      } catch (error) {
        console.error('Erreur lors de l\'installation:', error);
        // Si erreur, afficher les instructions manuelles
        this.showInstallInstructions();
      }
    } else if (isIOS) {
      // Pour iOS, afficher les instructions manuelles
      this.showInstallInstructions();
    } else {
      // Pour les autres navigateurs, essayer d'ouvrir le menu d'installation
      this.showInstallInstructions();
    }
  }
  
  private showInstallInstructions(): void {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let message = '';
    
    if (isIOS) {
      message = 'Pour installer l\'application sur iOS :\n\n' +
                '1. Appuyez sur le bouton "Partager" (carré avec flèche)\n' +
                '2. Faites défiler et appuyez sur "Sur l\'écran d\'accueil"\n' +
                '3. Appuyez sur "Ajouter"';
    } else if (isAndroid) {
      message = 'Pour installer l\'application sur Android :\n\n' +
                '1. Appuyez sur le menu (⋮) en haut à droite\n' +
                '2. Sélectionnez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil"';
    } else {
      message = 'Pour installer l\'application :\n\n' +
                '1. Cliquez sur l\'icône d\'installation dans la barre d\'adresse\n' +
                '2. Ou utilisez le menu du navigateur (⋮) > "Installer l\'application"';
    }
    
    alert(message);
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
