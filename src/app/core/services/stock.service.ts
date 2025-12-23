import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { StockItem, KitsStock, MaxKitsPossible } from '../models/stock.model';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private firestore: Firestore = inject(Firestore);
  private stockDocRef = doc(this.firestore, 'stock', 'current');
  private kitsDocRef = doc(this.firestore, 'stock', 'kits');

  /**
   * Récupère le stock actuel (lecture directe)
   */
  async getStock(): Promise<StockItem> {
    const stockSnap = await getDoc(this.stockDocRef);
    if (!stockSnap.exists()) {
      await this.initializeStockIfNeeded();
      const newSnap = await getDoc(this.stockDocRef);
      const data = newSnap.data() as any;
      return {
        drapsSimple: Number(data?.drapsSimple) || 0,
        housseSimple: Number(data?.housseSimple) || 0,
        drapsDouble: Number(data?.drapsDouble) || 0,
        housseDouble: Number(data?.housseDouble) || 0,
        taieOreiller: Number(data?.taieOreiller) || 0,
        grandeServiette: Number(data?.grandeServiette) || 0,
        petiteServiette: Number(data?.petiteServiette) || 0
      };
    }
    const data = stockSnap.data() as any;
    return {
      drapsSimple: Number(data.drapsSimple) || 0,
      housseSimple: Number(data.housseSimple) || 0,
      drapsDouble: Number(data.drapsDouble) || 0,
      housseDouble: Number(data.housseDouble) || 0,
      taieOreiller: Number(data.taieOreiller) || 0,
      grandeServiette: Number(data.grandeServiette) || 0,
      petiteServiette: Number(data.petiteServiette) || 0
    };
  }

  /**
   * Récupère le stock des kits (lecture directe)
   */
  async getKitsStock(): Promise<KitsStock> {
    const kitsSnap = await getDoc(this.kitsDocRef);
    if (!kitsSnap.exists()) {
      await this.initializeStockIfNeeded();
      const newSnap = await getDoc(this.kitsDocRef);
      const data = newSnap.data() as any;
      return {
        kitSimple: Number(data?.kitSimple) || 0,
        kitDouble: Number(data?.kitDouble) || 0,
        kitServiette: Number(data?.kitServiette) || 0
      };
    }
    const data = kitsSnap.data() as any;
    return {
      kitSimple: Number(data.kitSimple) || 0,
      kitDouble: Number(data.kitDouble) || 0,
      kitServiette: Number(data.kitServiette) || 0
    };
  }

  /**
   * Initialise le stock si inexistant
   */
  async initializeStockIfNeeded(): Promise<void> {
    const stockSnap = await getDoc(this.stockDocRef);
    if (!stockSnap.exists()) {
      const initialStock: StockItem = {
        drapsSimple: 0,
        housseSimple: 0,
        drapsDouble: 0,
        housseDouble: 0,
        taieOreiller: 0,
        grandeServiette: 0,
        petiteServiette: 0,
        updatedAt: new Date()
      };
      await setDoc(this.stockDocRef, initialStock);
    }

    const kitsSnap = await getDoc(this.kitsDocRef);
    if (!kitsSnap.exists()) {
      const initialKits: KitsStock = {
        kitSimple: 0,
        kitDouble: 0,
        kitServiette: 0,
        updatedAt: new Date()
      };
      await setDoc(this.kitsDocRef, initialKits);
    }
  }

  /**
   * Met à jour le stock d'un article
   */
  async updateStockItem(item: keyof Omit<StockItem, 'id' | 'updatedAt'>, quantity: number, operation: 'add' | 'remove'): Promise<void> {
    const stockSnap = await getDoc(this.stockDocRef);
    if (!stockSnap.exists()) {
      await this.initializeStockIfNeeded();
    }

    const currentStock = stockSnap.data() as StockItem;
    const currentValue = currentStock[item] || 0;
    
    let newValue: number;
    if (operation === 'add') {
      newValue = currentValue + quantity;
    } else {
      newValue = Math.max(0, currentValue - quantity);
    }

    await updateDoc(this.stockDocRef, {
      [item]: newValue,
      updatedAt: new Date()
    });
  }

  /**
   * Ajoute un kit simple (réduit le stock)
   */
  async addKitSimple(quantity: number = 1): Promise<void> {
    const stockSnap = await getDoc(this.stockDocRef);
    if (!stockSnap.exists()) {
      throw new Error('Le stock doit être initialisé');
    }

    const stock = stockSnap.data() as StockItem;
    
    // Vérifier si on peut créer le nombre de kits demandés
    const maxPossible = this.calculateMaxKitsPossible(stock).kitSimple;
    if (quantity > maxPossible) {
      throw new Error(`Impossible de créer ${quantity} kit(s) simple(s). Maximum possible : ${maxPossible}`);
    }

    // Réduire le stock
    await updateDoc(this.stockDocRef, {
      drapsSimple: stock.drapsSimple - quantity,
      housseSimple: stock.housseSimple - quantity,
      taieOreiller: stock.taieOreiller - quantity,
      updatedAt: new Date()
    });

    // Ajouter aux kits
    const kitsSnap = await getDoc(this.kitsDocRef);
    const kits = kitsSnap.exists() ? (kitsSnap.data() as KitsStock) : { kitSimple: 0, kitDouble: 0, kitServiette: 0 };
    await updateDoc(this.kitsDocRef, {
      kitSimple: (kits.kitSimple || 0) + quantity,
      updatedAt: new Date()
    });
  }

  /**
   * Ajoute un kit double (réduit le stock)
   */
  async addKitDouble(quantity: number = 1): Promise<void> {
    const stockSnap = await getDoc(this.stockDocRef);
    if (!stockSnap.exists()) {
      throw new Error('Le stock doit être initialisé');
    }

    const stock = stockSnap.data() as StockItem;
    
    // Vérifier si on peut créer le nombre de kits demandés
    const maxPossible = this.calculateMaxKitsPossible(stock).kitDouble;
    if (quantity > maxPossible) {
      throw new Error(`Impossible de créer ${quantity} kit(s) double(s). Maximum possible : ${maxPossible}`);
    }

    // Réduire le stock
    await updateDoc(this.stockDocRef, {
      drapsDouble: stock.drapsDouble - quantity,
      housseDouble: stock.housseDouble - quantity,
      taieOreiller: stock.taieOreiller - (quantity * 2),
      updatedAt: new Date()
    });

    // Ajouter aux kits
    const kitsSnap = await getDoc(this.kitsDocRef);
    const kits = kitsSnap.exists() ? (kitsSnap.data() as KitsStock) : { kitSimple: 0, kitDouble: 0, kitServiette: 0 };
    await updateDoc(this.kitsDocRef, {
      kitDouble: (kits.kitDouble || 0) + quantity,
      updatedAt: new Date()
    });
  }

  /**
   * Ajoute un kit serviette (réduit le stock)
   */
  async addKitServiette(quantity: number = 1): Promise<void> {
    const stockSnap = await getDoc(this.stockDocRef);
    if (!stockSnap.exists()) {
      throw new Error('Le stock doit être initialisé');
    }

    const stock = stockSnap.data() as StockItem;
    
    // Vérifier si on peut créer le nombre de kits demandés
    const maxPossible = this.calculateMaxKitsPossible(stock).kitServiette;
    if (quantity > maxPossible) {
      throw new Error(`Impossible de créer ${quantity} kit(s) serviette(s). Maximum possible : ${maxPossible}`);
    }

    // Réduire le stock
    await updateDoc(this.stockDocRef, {
      grandeServiette: stock.grandeServiette - quantity,
      petiteServiette: stock.petiteServiette - quantity,
      updatedAt: new Date()
    });

    // Ajouter aux kits
    const kitsSnap = await getDoc(this.kitsDocRef);
    const kits = kitsSnap.exists() ? (kitsSnap.data() as KitsStock) : { kitSimple: 0, kitDouble: 0, kitServiette: 0 };
    await updateDoc(this.kitsDocRef, {
      kitServiette: (kits.kitServiette || 0) + quantity,
      updatedAt: new Date()
    });
  }

  /**
   * Retire un kit (quand donné au client)
   */
  async removeKit(kitType: 'kitSimple' | 'kitDouble' | 'kitServiette', quantity: number = 1): Promise<void> {
    const kitsSnap = await getDoc(this.kitsDocRef);
    if (!kitsSnap.exists()) {
      throw new Error('Aucun kit disponible');
    }

    const kits = kitsSnap.data() as KitsStock;
    const currentQuantity = kits[kitType] || 0;
    
    if (quantity > currentQuantity) {
      throw new Error(`Impossible de retirer ${quantity} kit(s). Stock disponible : ${currentQuantity}`);
    }

    await updateDoc(this.kitsDocRef, {
      [kitType]: currentQuantity - quantity,
      updatedAt: new Date()
    });
  }

  /**
   * Calcule le nombre maximum de kits possibles avec le stock actuel
   */
  calculateMaxKitsPossible(stock: StockItem): MaxKitsPossible {
    return {
      kitSimple: Math.min(
        stock.drapsSimple || 0,
        stock.housseSimple || 0,
        stock.taieOreiller || 0
      ),
      kitDouble: Math.min(
        stock.drapsDouble || 0,
        stock.housseDouble || 0,
        Math.floor((stock.taieOreiller || 0) / 2)
      ),
      kitServiette: Math.min(
        stock.grandeServiette || 0,
        stock.petiteServiette || 0
      )
    };
  }

  /**
   * Récupère le nombre maximum de kits possibles
   */
  async getMaxKitsPossible(): Promise<MaxKitsPossible> {
    const stock = await this.getStock();
    return this.calculateMaxKitsPossible(stock);
  }
}

