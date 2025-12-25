import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppartementService } from '../core/services/appartement.service';
import { MenageService } from '../core/services/menage.service';
import { ToastService } from '../shared/services/toast.service';
import { Appartement } from '../core/models/appartement.model';
import { AppartementMenage, StatutMenage } from '../core/models/menage.model';
import { combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-gestion-menage',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './gestion-menage.component.html',
  styleUrl: './gestion-menage.component.scss'
})
export class GestionMenageComponent implements OnInit {
  private appartementService = inject(AppartementService);
  private menageService = inject(MenageService);
  private toastService = inject(ToastService);

  appartements: Appartement[] = [];
  statutsMenage: AppartementMenage[] = [];
  appartementsAvecStatut: Array<Appartement & { statut: StatutMenage }> = [];
  appartementsFiltres: Array<Appartement & { statut: StatutMenage }> = [];
  
  searchTerm: string = '';
  filterStatut: string = 'all'; // 'all', 'sale', 'propre', 'verifie'
  
  showConfirmationModal: boolean = false;
  appartementEnCours: (Appartement & { statut: StatutMenage }) | null = null;
  nouveauStatut: StatutMenage | null = null;
  isLoading: boolean = false;

  // Statistiques par bâtiment
  statistiquesParBatiment: Array<{
    batiment: string;
    total: number;
    sales: number;
    propres: number;
    verifies: number;
  }> = [];
  showStats: boolean = false;

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      // Charger les appartements et les statuts en parallèle
      combineLatest([
        this.appartementService.getAllAppartements(),
        this.menageService.getAllStatuts()
      ]).subscribe({
        next: ([appartements, statuts]) => {
          this.appartements = appartements;
          this.statutsMenage = statuts;
          
          // Combiner les appartements avec leurs statuts
          this.appartementsAvecStatut = appartements.map(appart => {
            const statut = statuts.find(s => s.numero === appart.numero);
            return {
              ...appart,
              statut: statut?.statut || 'sale' // Par défaut "sale" si pas de statut
            };
          });
          
          this.calculerStatistiques();
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => {
          this.appartementsAvecStatut = [];
          this.appartementsFiltres = [];
          this.isLoading = false;
        }
      });
    } catch (error) {
      this.appartementsAvecStatut = [];
      this.appartementsFiltres = [];
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    let filtered = [...this.appartementsAvecStatut];

    // Filtre par recherche
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(appart => {
        const numero = appart.numero.toLowerCase();
        const batiment = (appart.batiment || '').toLowerCase();
        return numero.includes(searchLower) || batiment.includes(searchLower);
      });
    }

    // Filtre par statut
    if (this.filterStatut !== 'all') {
      filtered = filtered.filter(appart => appart.statut === this.filterStatut);
    }

    // Trier par numéro
    filtered.sort((a, b) => a.numero.localeCompare(b.numero, 'fr'));

    this.appartementsFiltres = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  ouvrirModalChangementStatut(appartement: Appartement & { statut: StatutMenage }): void {
    this.appartementEnCours = appartement;
    
    // Déterminer le prochain statut dans le cycle : sale -> propre -> verifie -> sale
    const cycle: StatutMenage[] = ['sale', 'propre', 'verifie'];
    const currentIndex = cycle.indexOf(appartement.statut);
    const nextIndex = (currentIndex + 1) % cycle.length;
    this.nouveauStatut = cycle[nextIndex];
    
    this.showConfirmationModal = true;
  }

  fermerModal(): void {
    this.showConfirmationModal = false;
    this.appartementEnCours = null;
    this.nouveauStatut = null;
  }

  async confirmerChangementStatut(): Promise<void> {
    if (!this.appartementEnCours || !this.nouveauStatut) {
      return;
    }

    try {
      await this.menageService.updateStatut(
        this.appartementEnCours.numero,
        this.nouveauStatut,
        this.appartementEnCours.batiment
      );
      this.toastService.success(`Statut de ${this.appartementEnCours.numero} changé en ${this.getStatutLabel(this.nouveauStatut)}`);
      this.fermerModal();
      await this.loadData();
    } catch (error: any) {
      this.toastService.error(error.message || 'Erreur lors de la mise à jour du statut');
    }
  }

  getStatutLabel(statut: StatutMenage): string {
    const labels: { [key in StatutMenage]: string } = {
      'sale': 'Sale',
      'propre': 'Propre',
      'verifie': 'Vérifié'
    };
    return labels[statut];
  }

  getStatutClass(statut: StatutMenage): string {
    return `statut-${statut}`;
  }

  getStatutEmoji(statut: StatutMenage): string {
    const emojis: { [key in StatutMenage]: string } = {
      'sale': '🔴',
      'propre': '🟠',
      'verifie': '🟢'
    };
    return emojis[statut];
  }

  calculerStatistiques(): void {
    const statsMap = new Map<string, { total: number; sales: number; propres: number; verifies: number }>();

    // Initialiser avec "Tous" pour les statistiques globales
    statsMap.set('Tous', { total: 0, sales: 0, propres: 0, verifies: 0 });

    this.appartementsAvecStatut.forEach(appart => {
      const batiment = appart.batiment || 'Sans bâtiment';
      
      // Statistiques globales
      const statsTous = statsMap.get('Tous')!;
      statsTous.total++;
      if (appart.statut === 'sale') statsTous.sales++;
      else if (appart.statut === 'propre') statsTous.propres++;
      else if (appart.statut === 'verifie') statsTous.verifies++;

      // Statistiques par bâtiment
      if (!statsMap.has(batiment)) {
        statsMap.set(batiment, { total: 0, sales: 0, propres: 0, verifies: 0 });
      }
      const stats = statsMap.get(batiment)!;
      stats.total++;
      if (appart.statut === 'sale') stats.sales++;
      else if (appart.statut === 'propre') stats.propres++;
      else if (appart.statut === 'verifie') stats.verifies++;
    });

    // Convertir en tableau et trier
    this.statistiquesParBatiment = Array.from(statsMap.entries())
      .map(([batiment, stats]) => ({ batiment, ...stats }))
      .sort((a, b) => {
        // "Tous" en premier, puis par ordre alphabétique
        if (a.batiment === 'Tous') return -1;
        if (b.batiment === 'Tous') return 1;
        return a.batiment.localeCompare(b.batiment, 'fr');
      });
  }

  toggleStats(): void {
    this.showStats = !this.showStats;
  }
}

