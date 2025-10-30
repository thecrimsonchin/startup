export type UnitType = 'each' | 'case';

export type WeightUnit = 'lbs' | 'kg';

export interface SKU {
  id: string;
  name: string;
  length: number; // inches
  width: number; // inches
  height: number; // inches
  weight: number; // pounds or kg
  packType: string;
  description?: string;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
}

export interface Warehouse {
  id: string;
  companyId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
}

export interface OrderItem {
  sku: SKU;
  quantity: number;
  unitType: UnitType;
}

export interface PalletSize {
  length: number; // inches
  width: number; // inches
}

export interface PlacedItem {
  sku: SKU;
  quantity: number;
  x: number;
  y: number;
  width: number;
  length: number;
  rotated: boolean;
}

export interface Layer {
  items: PlacedItem[];
  height: number;
  weight: number;
}

export interface Pallet {
  id: number;
  layers: Layer[];
  totalHeight: number;
  totalWeight: number;
  palletSize: PalletSize;
  freightClass?: string;
}

export interface Order {
  poNumber: string;
  date: string; // MMDDYYYY
  company: Company;
  warehouse?: Warehouse;
  customer: Customer;
  recipient: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  items: OrderItem[];
  palletSize: PalletSize;
  maxPalletHeight: number;
  maxPalletWeight: number;
  weightUnit: WeightUnit;
}

export interface PackingResult {
  pallets: Pallet[];
  totalPallets: number;
  totalWeight: number;
  totalHeight: number;
  unplacedItems: OrderItem[];
}
