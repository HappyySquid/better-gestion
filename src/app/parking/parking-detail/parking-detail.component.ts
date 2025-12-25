import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ParkingService } from '../../core/services/parking.service';
import { ToastService } from '../../shared/services/toast.service';
import { ParkingClient, Batiment, ParkingStats } from '../../core/models/parking.model';

@Component({
  selector: 'app-parking-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './parking-detail.component.html',
  styleUrl: './parking-detail.component.scss'
})
export class ParkingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private parkingService = inject(ParkingService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  batiment: Batiment = 'Cimes';
  stats: ParkingStats = {
    totalPlaces: 50,
    placesUtilisees: 0,
    placesRestantes: 50,
    pourcentageUtilise: 0
  };
  
  clients: ParkingClient[] = [];
  filteredClients: ParkingClient[] = [];
  searchTerm: string = '';
  sortBy: 'all' | 'paye' | 'nonPaye' | 'reservation' = 'all';
  selectedDate: string = new Date().toISOString().split('T')[0]; // Date sélectionnée pour filtrer
  
  showAddForm: boolean = false;
  clientForm: FormGroup;
  isLoading: boolean = false;
  
  // Modal de confirmation de réservation
  showConfirmModal: boolean = false;
  reservationToConfirm: ParkingClient | null = null;
  confirmReservationForm: FormGroup;
  
  // Modal de suppression
  showSuppressionModal: boolean = false;
  clientEnCoursSuppression: ParkingClient | null = null;
  
  // Modal d'annulation de réservation
  showAnnulationModal: boolean = false;
  reservationEnCoursAnnulation: ParkingClient | null = null;

  constructor() {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    this.clientForm = this.fb.group({
      nom: ['', Validators.required],
      numAppartement: [''],
      plaqueImmatriculation: [''],
      modeleVehicule: [''],
      paye: [false],
      dateDebut: [today, Validators.required],
      dateFin: [nextWeekStr, Validators.required]
    }, {
      validators: this.conditionalValidator()
    });

    // Formulaire pour la confirmation de réservation
    this.confirmReservationForm = this.fb.group({
      plaqueImmatriculation: [''],
      modeleVehicule: ['']
    }, {
      validators: this.atLeastOneValidator('plaqueImmatriculation', 'modeleVehicule')
    });
  }

  // Validateur personnalisé : au moins un des deux champs doit être rempli
  atLeastOneValidator(field1: string, field2: string) {
    return (formGroup: FormGroup) => {
      const value1 = formGroup.get(field1)?.value;
      const value2 = formGroup.get(field2)?.value;
      
      if ((!value1 || value1.trim() === '') && (!value2 || value2.trim() === '')) {
        formGroup.get(field2)?.setErrors({ atLeastOneRequired: true });
        return { atLeastOneRequired: true };
      } else {
        formGroup.get(field2)?.setErrors(null);
        return null;
      }
    };
  }

  // Validateur conditionnel : plaque/modele requis seulement si ce n'est pas une réservation
  conditionalValidator() {
    return (formGroup: FormGroup) => {
      const dateDebut = formGroup.get('dateDebut')?.value;
      if (!dateDebut) {
        return null;
      }

      const dateDebutObj = new Date(dateDebut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateDebutObj.setHours(0, 0, 0, 0);

      // Si c'est une réservation (dateDebut dans le futur), pas besoin de plaque/modele
      if (dateDebutObj > today) {
        // Réinitialiser les erreurs si présentes
        formGroup.get('plaqueImmatriculation')?.setErrors(null);
        formGroup.get('modeleVehicule')?.setErrors(null);
        return null;
      }

      // Si ce n'est pas une réservation, appliquer le validateur
      return this.atLeastOneValidator('plaqueImmatriculation', 'modeleVehicule')(formGroup);
    };
  }

  async ngOnInit(): Promise<void> {
    const batimentParam = this.route.snapshot.paramMap.get('batiment');
    if (batimentParam === 'Cimes' || batimentParam === 'Vallon') {
      this.batiment = batimentParam;
      // Récupérer la date depuis les query params, sinon utiliser aujourd'hui
      const dateParam = this.route.snapshot.queryParamMap.get('date');
      if (dateParam) {
        this.selectedDate = dateParam;
      }
      await this.loadData();
    } else {
      this.router.navigate(['/parking']);
    }
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      const selectedDateObj = new Date(this.selectedDate);
      const [clients, stats] = await Promise.all([
        this.parkingService.getClientsByBatiment(this.batiment),
        this.parkingService.getParkingStats(this.batiment, selectedDateObj)
      ]);
      
      this.clients = clients;
      this.stats = stats;
      this.applyFilters();
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      this.toastService.error('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  async onDateChange(): Promise<void> {
    // Mettre à jour l'URL avec la nouvelle date
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date: this.selectedDate },
      queryParamsHandling: 'merge'
    });
    await this.loadData();
  }

  previousDay(): void {
    const date = new Date(this.selectedDate);
    date.setDate(date.getDate() - 1);
    this.selectedDate = date.toISOString().split('T')[0];
    this.onDateChange();
  }

  nextDay(): void {
    const date = new Date(this.selectedDate);
    date.setDate(date.getDate() + 1);
    this.selectedDate = date.toISOString().split('T')[0];
    this.onDateChange();
  }

  async onSubmit(): Promise<void> {
    // Vérifier si c'est une réservation pour appliquer la validation conditionnelle
    const dateDebut = this.clientForm.get('dateDebut')?.value;
    if (dateDebut) {
      const dateDebutObj = new Date(dateDebut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateDebutObj.setHours(0, 0, 0, 0);

      // Si ce n'est pas une réservation, vérifier que plaque ou modele est rempli
      if (dateDebutObj <= today) {
        const plaque = (this.clientForm.get('plaqueImmatriculation')?.value || '').trim();
        const modele = (this.clientForm.get('modeleVehicule')?.value || '').trim();
        
        if (!plaque && !modele) {
          this.clientForm.markAllAsTouched();
          this.toastService.error('Au moins la plaque d\'immatriculation ou le modèle du véhicule doit être renseigné pour un client présent');
          return;
        }
      }
    }

    // Vérifier la validation générale
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.toastService.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isLoading = true;
    try {
      const formValue = this.clientForm.value;
      const dateDebut = new Date(formValue.dateDebut);
      const dateFin = new Date(formValue.dateFin);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateDebutOnly = new Date(dateDebut);
      dateDebutOnly.setHours(0, 0, 0, 0);
      const estReservation = dateDebutOnly > today;
      
      // Pour les réservations, plaque et modele sont optionnels
      // Pour les clients présents, ils seront vérifiés par la validation conditionnelle
      const plaque = (formValue.plaqueImmatriculation || '').trim();
      const modele = (formValue.modeleVehicule || '').trim();
      
      const newClient: Omit<ParkingClient, 'id' | 'estReservation'> = {
        nom: formValue.nom.trim(),
        numAppartement: formValue.numAppartement?.trim() || undefined,
        plaqueImmatriculation: plaque || undefined,
        modeleVehicule: modele || undefined,
        paye: estReservation ? false : (formValue.paye || false), // Les réservations ne sont pas payées
        dateFin: dateFin,
        dateDebut: dateDebut,
        batiment: this.batiment
      };

      await this.parkingService.addClient(newClient);
      const message = estReservation ? 'Réservation créée avec succès' : 'Client ajouté avec succès';
      this.toastService.success(message);
      const todayStr = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      this.clientForm.reset({
        dateDebut: todayStr,
        dateFin: nextWeekStr,
        paye: false
      });
      this.showAddForm = false;
      await this.loadData();
    } catch (error: any) {
      this.toastService.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      this.isLoading = false;
    }
  }

  ouvrirModalSuppression(client: ParkingClient): void {
    this.clientEnCoursSuppression = client;
    this.showSuppressionModal = true;
  }

  fermerModalSuppression(): void {
    this.showSuppressionModal = false;
    this.clientEnCoursSuppression = null;
  }

  async confirmerSuppression(): Promise<void> {
    if (!this.clientEnCoursSuppression?.id) {
      return;
    }

    this.isLoading = true;
    try {
      await this.parkingService.removeClient(this.clientEnCoursSuppression.id);
      this.toastService.success('Client retiré avec succès');
      this.fermerModalSuppression();
      await this.loadData();
    } catch (error: any) {
      this.toastService.error(error.message || 'Erreur lors de la suppression');
    } finally {
      this.isLoading = false;
    }
  }

  ouvrirModalAnnulation(client: ParkingClient): void {
    this.reservationEnCoursAnnulation = client;
    this.showAnnulationModal = true;
  }

  fermerModalAnnulation(): void {
    this.showAnnulationModal = false;
    this.reservationEnCoursAnnulation = null;
  }

  async confirmerAnnulation(): Promise<void> {
    if (!this.reservationEnCoursAnnulation?.id) {
      return;
    }

    this.isLoading = true;
    try {
      await this.parkingService.removeClient(this.reservationEnCoursAnnulation.id);
      this.toastService.success('Réservation annulée avec succès');
      this.fermerModalAnnulation();
      await this.loadData();
    } catch (error: any) {
      this.toastService.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      this.isLoading = false;
    }
  }

  async togglePaye(client: ParkingClient): Promise<void> {
    if (client.id && !client.estReservation) {
      try {
        await this.parkingService.updateClient(client.id, { paye: !client.paye });
        this.toastService.success(`Statut de paiement mis à jour`);
        await this.loadData();
      } catch (error: any) {
        this.toastService.error(error.message || 'Erreur lors de la mise à jour');
      }
    }
  }

  ouvrirModalConfirmation(client: ParkingClient): void {
    if (client.estReservation) {
      this.reservationToConfirm = client;
      this.confirmReservationForm.reset({
        plaqueImmatriculation: client.plaqueImmatriculation || '',
        modeleVehicule: client.modeleVehicule || ''
      });
      this.showConfirmModal = true;
    }
  }

  fermerModalConfirmation(): void {
    this.showConfirmModal = false;
    this.reservationToConfirm = null;
    this.confirmReservationForm.reset();
  }

  async confirmerReservation(): Promise<void> {
    if (!this.reservationToConfirm?.id) {
      return;
    }

    if (this.confirmReservationForm.invalid) {
      this.confirmReservationForm.markAllAsTouched();
      if (this.confirmReservationForm.errors?.['atLeastOneRequired']) {
        this.toastService.error('Veuillez renseigner au moins la plaque d\'immatriculation ou le modèle du véhicule');
      } else {
        this.toastService.error('Veuillez remplir tous les champs obligatoires');
      }
      return;
    }

    const formValue = this.confirmReservationForm.value;
    const plaqueImmatriculation = (formValue.plaqueImmatriculation || '').trim();
    const modeleVehicule = (formValue.modeleVehicule || '').trim();

    if (!plaqueImmatriculation && !modeleVehicule) {
      this.toastService.error('Veuillez renseigner au moins la plaque d\'immatriculation ou le modèle du véhicule');
      return;
    }

    this.isLoading = true;
    try {
      await this.parkingService.confirmerReservation(
        this.reservationToConfirm.id,
        plaqueImmatriculation || undefined,
        modeleVehicule || undefined
      );
      this.toastService.success('Réservation confirmée');
      this.fermerModalConfirmation();
      await this.loadData();
    } catch (error: any) {
      this.toastService.error(error.message || 'Erreur lors de la confirmation');
    } finally {
      this.isLoading = false;
    }
  }


  onSearchChange(): void {
    this.applyFilters();
  }

  async onSearchInput(): Promise<void> {
    // Recherche en temps réel dans Firestore si nécessaire
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.clients];
    const selectedDateObj = new Date(this.selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);

    // Filtrer par date : afficher seulement les clients présents à la date sélectionnée
    filtered = filtered.filter(client => {
      const dateDebut = new Date(client.dateDebut);
      dateDebut.setHours(0, 0, 0, 0);
      const dateFin = client.dateFin ? new Date(client.dateFin) : null;
      if (dateFin) {
        dateFin.setHours(0, 0, 0, 0);
      }
      
      // Client présent si dateDebut <= date sélectionnée <= dateFin (ou pas de dateFin)
      return dateDebut <= selectedDateObj && (!dateFin || dateFin >= selectedDateObj);
    });

    // Recherche dans tous les champs : nom, plaque, modèle, numAppartement
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(client => {
        const nomMatch = client.nom.toLowerCase().includes(search);
        const plaqueMatch = client.plaqueImmatriculation?.toLowerCase().includes(search) || false;
        const modeleMatch = client.modeleVehicule?.toLowerCase().includes(search) || false;
        const numAppMatch = client.numAppartement?.toLowerCase().includes(search) || false;
        return nomMatch || plaqueMatch || modeleMatch || numAppMatch;
      });
    }

    // Tri par payé/non payé/réservation
    if (this.sortBy === 'paye') {
      filtered = filtered.filter(client => client.paye);
    } else if (this.sortBy === 'nonPaye') {
      filtered = filtered.filter(client => !client.paye);
    } else if (this.sortBy === 'reservation') {
      filtered = filtered.filter(client => client.estReservation);
    }

    // Trier par ordre alphabétique par défaut
    filtered.sort((a, b) => {
      const nomA = (a.nom || '').toLowerCase();
      const nomB = (b.nom || '').toLowerCase();
      return nomA.localeCompare(nomB, 'fr');
    });

    this.filteredClients = filtered;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  isReservation(): boolean {
    const dateDebut = this.clientForm.get('dateDebut')?.value;
    if (!dateDebut) return false;
    const dateDebutObj = new Date(dateDebut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateDebutObj.setHours(0, 0, 0, 0);
    return dateDebutObj > today;
  }
}
