export interface StockItem {
  id?: string;
  drapsSimple: number;
  housseSimple: number;
  drapsDouble: number;
  housseDouble: number;
  taieOreiller: number;
  grandeServiette: number;
  petiteServiette: number;
  updatedAt?: Date;
  [key: string]: any;
}

export interface KitsStock {
  id?: string;
  kitSimple: number;
  kitDouble: number;
  kitServiette: number;
  updatedAt?: Date;
  [key: string]: any;
}

export interface MaxKitsPossible {
  kitSimple: number;
  kitDouble: number;
  kitServiette: number;
  [key: string]: any;
}

export type StockOperation = 'add' | 'remove';

