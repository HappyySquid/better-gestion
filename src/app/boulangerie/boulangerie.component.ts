import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormArray, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BoulangerieService } from '../core/services/boulangerie.service';
import { ToastService } from '../shared/services/toast.service';
import { AppartementService } from '../core/services/appartement.service';
import { CommandeBoulangerie, PRODUITS_BOULANGERIE, ProduitBoulangerie } from '../core/models/boulangerie.model';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-boulangerie',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './boulangerie.component.html',
  styleUrl: './boulangerie.component.scss'
})
export class BoulangerieComponent implements OnInit {
  private boulangerieService = inject(BoulangerieService);
  private appartementService = inject(AppartementService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  produits: ProduitBoulangerie[] = PRODUITS_BOULANGERIE;
  commandes: CommandeBoulangerie[] = [];
  commandesFiltrees: CommandeBoulangerie[] = [];
  selectedDate: string = new Date().toISOString().split('T')[0]; // Par défaut aujourd'hui
  showAddForm: boolean = false;
  isLoading: boolean = false;
  showPaiementModal: boolean = false;
  commandeEnCoursPaiement: CommandeBoulangerie | null = null;
  selectedMoyenPaiement: string = '';
  showDonneeModal: boolean = false;
  commandeEnCoursDonnee: CommandeBoulangerie | null = null;
  showSuppressionModal: boolean = false;
  commandeEnCoursSuppression: CommandeBoulangerie | null = null;
  showAnnulerDonneeModal: boolean = false;
  commandeEnCoursAnnulerDonnee: CommandeBoulangerie | null = null;
  searchTerm: string = '';
  sortBy: string = 'all'; // 'all', 'nonDonnees', 'nonPayees'

  commandeForm: FormGroup;

  // Validateur asynchrone pour vérifier que l'appartement existe
  appartementValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value.trim() === '') {
        return of(null);
      }
      return this.appartementService.appartementExists(control.value).pipe(
        map(exists => {
          return exists ? null : { appartementNotFound: true };
        }),
        catchError(() => of(null))
      );
    };
  }

  constructor() {
    // Date par défaut : lendemain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    this.commandeForm = this.fb.group({
      numAppartement: ['', [Validators.required], [this.appartementValidator()]],
      dateCommande: [tomorrowStr, Validators.required],
      paye: [false],
      moyenPaiement: [''], // Sera requis si paye = true
      produits: this.fb.array([])
    });

    // Ajouter un champ produit par défaut
    this.addProduit();
  }

  get produitsFormArray(): FormArray {
    return this.commandeForm.get('produits') as FormArray;
  }

  /**
   * Calcule le total de la commande en cours
   */
  getTotalCommande(): number {
    let total = 0;
    this.produitsFormArray.controls.forEach(control => {
      const produitId = control.get('produitId')?.value;
      const quantite = control.get('quantite')?.value || 0;
      if (produitId && quantite > 0) {
        const produit = this.produits.find(p => p.id === produitId);
        if (produit) {
          total += produit.prix * quantite;
        }
      }
    });
    return total;
  }

  addProduit(): void {
    const produitGroup = this.fb.group({
      produitId: ['', Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]]
    });
    this.produitsFormArray.push(produitGroup);
  }

  removeProduit(index: number): void {
    if (this.produitsFormArray.length > 1) {
      this.produitsFormArray.removeAt(index);
    }
  }

  incrementQuantite(index: number): void {
    const quantiteControl = this.produitsFormArray.at(index).get('quantite');
    if (quantiteControl) {
      const currentValue = quantiteControl.value || 1;
      quantiteControl.setValue(currentValue + 1);
    }
  }

  decrementQuantite(index: number): void {
    const quantiteControl = this.produitsFormArray.at(index).get('quantite');
    if (quantiteControl) {
      const currentValue = quantiteControl.value || 1;
      if (currentValue > 1) {
        quantiteControl.setValue(currentValue - 1);
      }
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadCommandes();
  }

  async loadCommandes(): Promise<void> {
    try {
      this.commandes = await this.boulangerieService.getAllCommandes();
      this.applyFilters();
    } catch (error: any) {
      this.commandes = [];
      this.commandesFiltrees = [];
    }
  }

  async onDateChange(): Promise<void> {
    this.applyFilters();
  }

  previousDay(): void {
    const currentDate = new Date(this.selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    this.selectedDate = currentDate.toISOString().split('T')[0];
    this.onDateChange();
  }

  nextDay(): void {
    const currentDate = new Date(this.selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    this.selectedDate = currentDate.toISOString().split('T')[0];
    this.onDateChange();
  }

  applyFilters(): void {
    if (!this.selectedDate) {
      this.commandesFiltrees = [];
      return;
    }
    
    // Créer la date de référence à partir de la string YYYY-MM-DD
    const [year, month, day] = this.selectedDate.split('-').map(Number);
    const selectedDateObj = new Date(year, month - 1, day);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    let filtered = this.commandes.filter(commande => {
      if (!commande.dateCommande) {
        return false;
      }
      
      const commandeDate = new Date(commande.dateCommande);
      commandeDate.setHours(0, 0, 0, 0);
      
      return commandeDate.getTime() === selectedDateObj.getTime();
    });

    // Appliquer le filtre de recherche
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(commande => {
        const appartement = (commande.numAppartement || '').toLowerCase();
        const nomClient = (commande.nomClient || '').toLowerCase();
        return appartement.includes(searchLower) || nomClient.includes(searchLower);
      });
    }

    // Appliquer le filtre de tri
    if (this.sortBy === 'nonDonnees') {
      filtered = filtered.filter(c => !c.donneAuClient);
    } else if (this.sortBy === 'nonPayees') {
      filtered = filtered.filter(c => !c.paye);
    }

    // Trier par ordre alphabétique par défaut
    filtered.sort((a, b) => {
      const nomA = (a.numAppartement || a.nomClient || '').toLowerCase();
      const nomB = (b.numAppartement || b.nomClient || '').toLowerCase();
      return nomA.localeCompare(nomB, 'fr');
    });
    
    this.commandesFiltrees = filtered;
    
    console.log(`Filtrage: ${this.commandes.length} commandes totales, ${this.commandesFiltrees.length} pour le ${this.selectedDate}`);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  async onSubmit(): Promise<void> {
    const formValue = this.commandeForm.value;
    
    // Vérifier qu'au moins un produit est sélectionné
    const produitsValides = formValue.produits.filter((p: any) => p.produitId && p.quantite > 0);
    if (produitsValides.length === 0) {
      this.toastService.error('Veuillez ajouter au moins un produit');
      return;
    }

    // Vérifier le moyen de paiement si payé
    if (formValue.paye && (!formValue.moyenPaiement || formValue.moyenPaiement.trim() === '')) {
      this.toastService.error('Veuillez préciser le moyen de paiement');
      return;
    }

    if (this.commandeForm.invalid) {
      this.commandeForm.markAllAsTouched();
      this.toastService.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier que la date est au moins le lendemain
    const dateCommande = new Date(formValue.dateCommande);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateCommande.setHours(0, 0, 0, 0);
    
    if (dateCommande <= today) {
      this.toastService.error('La date de commande doit être au moins le lendemain');
      return;
    }

    try {
      const nouvelleCommande: Omit<CommandeBoulangerie, 'id' | 'dateCreation' | 'total'> = {
        numAppartement: formValue.numAppartement.trim(),
        nomClient: undefined, // Plus utilisé, on garde juste pour compatibilité
        dateCommande: dateCommande,
        paye: formValue.paye || false,
        moyenPaiement: formValue.paye && formValue.moyenPaiement ? formValue.moyenPaiement.trim() : undefined,
        donneAuClient: false,
        produits: produitsValides.map((p: any) => ({
          produitId: p.produitId,
          quantite: p.quantite
        }))
      };

      await this.boulangerieService.addCommande(nouvelleCommande);
      this.toastService.success('Commande ajoutée avec succès');
      
      // Changer la date sélectionnée pour correspondre à la date de la commande
      const dateCommandeStr = dateCommande.toISOString().split('T')[0];
      this.selectedDate = dateCommandeStr;
      
      // Réinitialiser le formulaire
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      this.commandeForm.reset({
        numAppartement: '',
        dateCommande: tomorrowStr,
        paye: false,
        moyenPaiement: '',
        produits: []
      });
      
      // Réinitialiser le FormArray
      while (this.produitsFormArray.length > 0) {
        this.produitsFormArray.removeAt(0);
      }
      this.addProduit();
      
      this.showAddForm = false;
      await this.loadCommandes();
    } catch (error: any) {
      console.error('Erreur:', error);
      this.toastService.error(error.message || 'Erreur lors de l\'ajout de la commande');
    }
  }

  ouvrirModalDonnee(commande: CommandeBoulangerie): void {
    this.commandeEnCoursDonnee = commande;
    this.showDonneeModal = true;
  }

  fermerModalDonnee(): void {
    this.showDonneeModal = false;
    this.commandeEnCoursDonnee = null;
  }

  async confirmerDonnee(): Promise<void> {
    if (!this.commandeEnCoursDonnee?.id) {
      return;
    }

    try {
      await this.boulangerieService.marquerCommeDonnee(this.commandeEnCoursDonnee.id);
      this.toastService.success('Commande marquée comme donnée au client');
      this.fermerModalDonnee();
      await this.loadCommandes();
    } catch (error: any) {
      console.error('Erreur:', error);
      this.toastService.error(error.message || 'Erreur lors de la mise à jour');
    }
  }

  async marquerCommeDonnee(commandeId: string): Promise<void> {
    const commande = this.commandesFiltrees.find(c => c.id === commandeId);
    if (commande) {
      this.ouvrirModalDonnee(commande);
    }
  }

  ouvrirModalPaiement(commande: CommandeBoulangerie): void {
    this.commandeEnCoursPaiement = commande;
    this.selectedMoyenPaiement = '';
    this.showPaiementModal = true;
  }

  fermerModalPaiement(): void {
    this.showPaiementModal = false;
    this.commandeEnCoursPaiement = null;
    this.selectedMoyenPaiement = '';
  }

  async confirmerPaiement(): Promise<void> {
    if (!this.commandeEnCoursPaiement?.id) {
      return;
    }

    // Si la commande est déjà payée, on annule le paiement
    if (this.commandeEnCoursPaiement.paye) {
      await this.confirmerAnnulerPaiement();
      return;
    }

    // Sinon, on demande le moyen de paiement
    if (!this.selectedMoyenPaiement) {
      this.toastService.error('Veuillez sélectionner un moyen de paiement');
      return;
    }

    try {
      await this.boulangerieService.marquerCommePayee(this.commandeEnCoursPaiement.id, true, this.selectedMoyenPaiement);
      this.toastService.success(`Commande marquée comme payée (${this.selectedMoyenPaiement})`);
      this.fermerModalPaiement();
      await this.loadCommandes();
    } catch (error: any) {
      console.error('Erreur:', error);
      this.toastService.error(error.message || 'Erreur lors de la mise à jour');
    }
  }

  async togglePaye(commande: CommandeBoulangerie): Promise<void> {
    if (commande.id) {
      if (!commande.paye) {
        // Ouvrir la modale pour sélectionner le moyen de paiement
        this.ouvrirModalPaiement(commande);
      } else {
        // Si on marque comme non payé, ouvrir une modal de confirmation
        this.ouvrirModalAnnulerPaiement(commande);
      }
    }
  }

  ouvrirModalSuppression(commande: CommandeBoulangerie): void {
    this.commandeEnCoursSuppression = commande;
    this.showSuppressionModal = true;
  }

  fermerModalSuppression(): void {
    this.showSuppressionModal = false;
    this.commandeEnCoursSuppression = null;
  }

  async confirmerSuppression(): Promise<void> {
    if (!this.commandeEnCoursSuppression?.id) {
      return;
    }

    try {
      await this.boulangerieService.deleteCommande(this.commandeEnCoursSuppression.id);
      this.toastService.success('Commande supprimée avec succès');
      this.fermerModalSuppression();
      await this.loadCommandes();
    } catch (error: any) {
      console.error('Erreur:', error);
      this.toastService.error(error.message || 'Erreur lors de la suppression');
    }
  }

  ouvrirModalAnnulerDonnee(commande: CommandeBoulangerie): void {
    this.commandeEnCoursAnnulerDonnee = commande;
    this.showAnnulerDonneeModal = true;
  }

  fermerModalAnnulerDonnee(): void {
    this.showAnnulerDonneeModal = false;
    this.commandeEnCoursAnnulerDonnee = null;
  }

  async confirmerAnnulerDonnee(): Promise<void> {
    if (!this.commandeEnCoursAnnulerDonnee?.id) {
      return;
    }

    try {
      await this.boulangerieService.annulerDonnee(this.commandeEnCoursAnnulerDonnee.id);
      this.toastService.success('Statut "Donné au client" annulé');
      this.fermerModalAnnulerDonnee();
      await this.loadCommandes();
    } catch (error: any) {
      console.error('Erreur:', error);
      this.toastService.error(error.message || 'Erreur lors de la mise à jour');
    }
  }

  ouvrirModalAnnulerPaiement(commande: CommandeBoulangerie): void {
    this.commandeEnCoursPaiement = commande;
    this.selectedMoyenPaiement = '';
    this.showPaiementModal = true;
  }

  async confirmerAnnulerPaiement(): Promise<void> {
    if (!this.commandeEnCoursPaiement?.id) {
      return;
    }

    try {
      await this.boulangerieService.marquerCommePayee(this.commandeEnCoursPaiement.id, false);
      this.toastService.success('Commande marquée comme non payée');
      this.fermerModalPaiement();
      await this.loadCommandes();
    } catch (error: any) {
      console.error('Erreur:', error);
      this.toastService.error(error.message || 'Erreur lors de la mise à jour');
    }
  }

  getProduitNom(produitId: string): string {
    const produit = this.produits.find(p => p.id === produitId);
    return produit ? produit.nom : produitId;
  }

  getProduitPrix(produitId: string): number {
    const produit = this.produits.find(p => p.id === produitId);
    return produit ? produit.prix : 0;
  }

  getProduitEmoji(produitId: string): string {
    const emojiMap: { [key: string]: string } = {
      'champsaurine': '🥖',
      'flute-ancienne': '🍞',
      'pain-cereales': '🌾',
      'croissant': '🥐',
      'pain-chocolat': '🍫'
    };
    return emojiMap[produitId] || '🍞';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatPrix(prix: number): string {
    return prix.toFixed(2).replace('.', ',') + ' €';
  }

  getSelectedDateFormatted(): string {
    return this.formatDate(new Date(this.selectedDate));
  }

  /**
   * Calcule le total de commandes par produit pour la date sélectionnée
   */
  getTotalParProduit(): { produitId: string; nom: string; total: number }[] {
    const totals: { [key: string]: number } = {};
    
    this.commandesFiltrees.forEach(commande => {
      commande.produits.forEach(item => {
        if (!totals[item.produitId]) {
          totals[item.produitId] = 0;
        }
        totals[item.produitId] += item.quantite;
      });
    });

    return this.produits.map(produit => ({
      produitId: produit.id,
      nom: produit.nom,
      total: totals[produit.id] || 0
    })).filter(item => item.total > 0);
  }

  /**
   * Imprime le récapitulatif des commandes du jour
   */
  async printRecap(): Promise<void> {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastService.error('Impossible d\'ouvrir la fenêtre d\'impression');
      return;
    }

    const today = new Date(this.selectedDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Charger tous les appartements pour déterminer les bâtiments
    const appartements = await new Promise<any[]>((resolve) => {
      this.appartementService.getAllAppartements().subscribe({
        next: (apps) => resolve(apps),
        error: () => resolve([])
      });
    });

    // Créer un map pour accéder rapidement au bâtiment par numéro d'appartement
    const batimentMap = new Map<string, string>();
    appartements.forEach(app => {
      if (app.batiment) {
        batimentMap.set(app.numero.toUpperCase(), app.batiment);
      }
    });

    // Calculer les totaux par bâtiment
    let totalCBCimes = 0;
    let totalCBVallon = 0;
    let totalEspecesCimes = 0;
    let totalEspecesVallon = 0;
    const commandesPayees = this.commandesFiltrees.filter(c => c.paye);
    
    commandesPayees.forEach(commande => {
      const batiment = commande.numAppartement 
        ? (batimentMap.get(commande.numAppartement.toUpperCase()) || '')
        : '';
      
      if (commande.moyenPaiement === 'CB') {
        if (batiment === 'Cimes') {
          totalCBCimes += commande.total;
        } else if (batiment === 'Vallon') {
          totalCBVallon += commande.total;
        }
      } else if (commande.moyenPaiement === 'Espèces') {
        if (batiment === 'Cimes') {
          totalEspecesCimes += commande.total;
        } else if (batiment === 'Vallon') {
          totalEspecesVallon += commande.total;
        }
      }
    });

    const totalCB = totalCBCimes + totalCBVallon;
    const totalEspeces = totalEspecesCimes + totalEspecesVallon;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Récapitulatif Commandes - ${today}</title>
        <style>
          @media print {
            @page {
              margin: 0.8cm;
              size: A4;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: Verdana, sans-serif;
            padding: 15px;
            color: #333;
            margin: 0;
          }
          h1 {
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 8px;
            margin-bottom: 15px;
            margin-top: 0;
            font-size: 24px;
          }
          h2 {
            color: #764ba2;
            margin-top: 15px;
            margin-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 4px;
            font-size: 18px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 13px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background-color: #f7fafc;
            font-weight: 600;
            color: #2d3748;
            font-size: 12px;
          }
          .total-row {
            font-weight: 600;
            background-color: #f7fafc;
          }
          .total-final {
            font-weight: 700;
            font-size: 16px;
            background-color: #e6f3ff;
            color: #2c5282;
          }
          .moyen-paiement {
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <h1>Récapitulatif des Commandes</h1>
        <p><strong>Date :</strong> ${today}</p>

        <h2>Détail par client</h2>
        <table>
          <thead>
            <tr>
              <th>Appartement</th>
              <th>Contenu</th>
              <th>Total</th>
              <th>Mode de paiement</th>
            </tr>
          </thead>
          <tbody>
            ${this.commandesFiltrees.map(commande => {
              const contenu = commande.produits.map(item => {
                const produit = this.produits.find(p => p.id === item.produitId);
                const nomProduit = produit ? produit.nom : item.produitId;
                return `${item.quantite}x ${nomProduit}`;
              }).join(', ');
              return `
              <tr>
                <td>${commande.numAppartement || '-'}</td>
                <td>${contenu || '-'}</td>
                <td>${this.formatPrix(commande.total)}</td>
                <td class="moyen-paiement">${commande.paye ? (commande.moyenPaiement || 'Non spécifié') : 'Non payé'}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>

        <h2>Totaux</h2>
        <table>
          <tbody>
            <tr class="total-row">
              <td><strong>Total CB Cimes</strong></td>
              <td><strong>${this.formatPrix(totalCBCimes)}</strong></td>
            </tr>
            <tr class="total-row">
              <td><strong>Total CB Vallon</strong></td>
              <td><strong>${this.formatPrix(totalCBVallon)}</strong></td>
            </tr>
            <tr class="total-row">
              <td><strong>Total CB</strong></td>
              <td><strong>${this.formatPrix(totalCB)}</strong></td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Espèces Cimes</strong></td>
              <td><strong>${this.formatPrix(totalEspecesCimes)}</strong></td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Espèces Vallon</strong></td>
              <td><strong>${this.formatPrix(totalEspecesVallon)}</strong></td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Espèces</strong></td>
              <td><strong>${this.formatPrix(totalEspeces)}</strong></td>
            </tr>
            <tr class="total-final">
              <td><strong>TOTAL GÉNÉRAL</strong></td>
              <td><strong>${this.formatPrix(totalCB + totalEspeces)}</strong></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Attendre que le contenu soit chargé avant d'imprimer
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  }
}

