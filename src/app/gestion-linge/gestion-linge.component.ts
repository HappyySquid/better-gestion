import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StockService } from '../core/services/stock.service';
import { StockItem, KitsStock, MaxKitsPossible } from '../core/models/stock.model';
import { ToastService } from '../shared/services/toast.service';

@Component({
  selector: 'app-gestion-linge',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './gestion-linge.component.html',
  styleUrl: './gestion-linge.component.scss'
})
export class GestionLingeComponent implements OnInit {
  private stockService = inject(StockService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastService = inject(ToastService);

  stock: StockItem = {
    drapsSimple: 0,
    housseSimple: 0,
    drapsDouble: 0,
    housseDouble: 0,
    taieOreiller: 0,
    grandeServiette: 0,
    petiteServiette: 0
  };

  kits: KitsStock = {
    kitSimple: 0,
    kitDouble: 0,
    kitServiette: 0
  };

  maxKits: MaxKitsPossible = {
    kitSimple: 0,
    kitDouble: 0,
    kitServiette: 0
  };
  
  stockForm: FormGroup;
  kitForm: FormGroup;
  removeKitForm: FormGroup;
  
  isLoading: boolean = false;

  stockItems = [
    { key: 'drapsSimple', label: 'Draps Simple' },
    { key: 'housseSimple', label: 'Housse Simple' },
    { key: 'drapsDouble', label: 'Draps Double' },
    { key: 'housseDouble', label: 'Housse Double' },
    { key: 'taieOreiller', label: 'Taie d\'oreiller' },
    { key: 'grandeServiette', label: 'Grande Serviette' },
    { key: 'petiteServiette', label: 'Petite Serviette' }
  ];

  kitTypes = [
    { key: 'kitSimple', label: 'Kit Simple', description: '1 draps simple, 1 housse simple, 1 taie' },
    { key: 'kitDouble', label: 'Kit Double', description: '1 draps double, 1 housse double, 2 taies' },
    { key: 'kitServiette', label: 'Kit Serviette', description: '1 grande serviette, 1 petite serviette' }
  ];

  constructor() {
    this.stockForm = this.fb.group({
      item: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      operation: ['add', Validators.required]
    });

    this.kitForm = this.fb.group({
      kitType: ['kitSimple', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });

    this.removeKitForm = this.fb.group({
      kitType: ['kitSimple', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  /**
   * Charge toutes les données depuis Firestore
   */
  async loadData(): Promise<void> {
    try {
      await this.stockService.initializeStockIfNeeded();
      this.stock = await this.stockService.getStock();
      this.kits = await this.stockService.getKitsStock();
      this.maxKits = await this.stockService.getMaxKitsPossible();
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      this.toastService.error('Erreur lors du chargement des données');
    }
  }

  async onStockSubmit(): Promise<void> {
    if (this.stockForm.valid) {
      this.isLoading = true;

      try {
        const { item, quantity, operation } = this.stockForm.value;
        await this.stockService.updateStockItem(item, quantity, operation);
        this.toastService.success(`Stock ${operation === 'add' ? 'ajouté' : 'retiré'} avec succès`);
        this.stockForm.patchValue({ quantity: 1 });
        // Recharger les données
        await this.loadData();
      } catch (error: any) {
        this.toastService.error(error.message || 'Une erreur est survenue');
      } finally {
        this.isLoading = false;
      }
    }
  }

  async onAddKit(): Promise<void> {
    if (this.kitForm.valid) {
      this.isLoading = true;

      try {
        const { kitType, quantity } = this.kitForm.value;
        
        // Vérifier le stock avant d'ajouter
        const maxPossible = this.maxKits[kitType];
        if (quantity > maxPossible) {
          this.toastService.error(`Stock insuffisant ! Maximum possible : ${maxPossible} kit(s) ${this.getKitLabel(kitType)}`);
          return;
        }
        
        switch (kitType) {
          case 'kitSimple':
            await this.stockService.addKitSimple(quantity);
            break;
          case 'kitDouble':
            await this.stockService.addKitDouble(quantity);
            break;
          case 'kitServiette':
            await this.stockService.addKitServiette(quantity);
            break;
        }
        
        this.toastService.success(`${quantity} kit(s) ${this.getKitLabel(kitType)} ajouté(s) avec succès`);
        this.kitForm.patchValue({ quantity: 1 });
        // Recharger les données
        await this.loadData();
      } catch (error: any) {
        this.toastService.error(error.message || 'Une erreur est survenue lors de la création du kit');
      } finally {
        this.isLoading = false;
      }
    }
  }

  async onRemoveKit(): Promise<void> {
    if (this.removeKitForm.valid) {
      this.isLoading = true;

      try {
        const { kitType, quantity } = this.removeKitForm.value;
        await this.stockService.removeKit(kitType, quantity);
        this.toastService.success(`${quantity} kit(s) ${this.getKitLabel(kitType)} retiré(s) avec succès`);
        this.removeKitForm.patchValue({ quantity: 1 });
        // Recharger les données
        await this.loadData();
      } catch (error: any) {
        this.toastService.error(error.message || 'Une erreur est survenue');
      } finally {
        this.isLoading = false;
      }
    }
  }

  getKitLabel(kitType: string): string {
    const kit = this.kitTypes.find(k => k.key === kitType);
    return kit ? kit.label : kitType;
  }

  getSelectedKitDescription(): string {
    const selectedType = this.kitForm.get('kitType')?.value;
    if (!selectedType) return '';
    const kit = this.kitTypes.find(k => k.key === selectedType);
    return kit ? kit.description : '';
  }

  getMaxKitForSelected(): number {
    const selectedType = this.kitForm.get('kitType')?.value;
    if (!selectedType) return 0;
    return this.maxKits[selectedType] || 0;
  }

  getAvailableKitForSelected(): number {
    const selectedType = this.removeKitForm.get('kitType')?.value;
    if (!selectedType) return 0;
    return this.kits[selectedType] || 0;
  }

  /**
   * Imprime les données des stocks et kits
   */
  printStock(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastService.error('Impossible d\'ouvrir la fenêtre d\'impression');
      return;
    }

    const today = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>État du Stock - ${today}</title>
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
          .section {
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 13px;
          }
          th, td {
            padding: 6px 8px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background-color: #f7fafc;
            font-weight: 600;
            color: #2d3748;
            font-size: 12px;
          }
          tr:hover {
            background-color: #f7fafc;
          }
          .value {
            font-weight: 600;
            color: #667eea;
            font-size: 1em;
          }
          p {
            margin: 0 0 10px 0;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <h1>État du Stock - Gestion du Linge</h1>
        <p><strong>Date d'impression :</strong> ${today}</p>

        <div class="section">
          <h2>Stock Global</h2>
          <table>
            <thead>
              <tr>
                <th>Article</th>
                <th>Quantité</th>
              </tr>
            </thead>
            <tbody>
              ${this.stockItems.map(item => `
                <tr>
                  <td>${item.label}</td>
                  <td class="value">${this.stock[item.key] ?? 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Kits Disponibles</h2>
          <table>
            <thead>
              <tr>
                <th>Type de Kit</th>
                <th>Description</th>
                <th>Quantité Disponible</th>
              </tr>
            </thead>
            <tbody>
              ${this.kitTypes.map(kit => `
                <tr>
                  <td><strong>${kit.label}</strong></td>
                  <td>${kit.description}</td>
                  <td class="value">${this.kits[kit.key] ?? 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
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
