import type { SKU, Company, Customer, Warehouse } from '../types';

const STORAGE_KEYS = {
  SKUS: 'palletPlanner_skus',
  COMPANIES: 'palletPlanner_companies',
  WAREHOUSES: 'palletPlanner_warehouses',
  CUSTOMERS: 'palletPlanner_customers'
};

export class StorageManager {
  // SKU Management
  static getSKUs(): SKU[] {
    const data = localStorage.getItem(STORAGE_KEYS.SKUS);
    return data ? JSON.parse(data) : [];
  }

  static saveSKU(sku: SKU): void {
    const skus = this.getSKUs();
    const index = skus.findIndex(s => s.id === sku.id);
    if (index >= 0) {
      skus[index] = sku;
    } else {
      skus.push(sku);
    }
    localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(skus));
  }

  static deleteSKU(id: string): void {
    const skus = this.getSKUs().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(skus));
  }

  // Company Management
  static getCompanies(): Company[] {
    const data = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    return data ? JSON.parse(data) : [];
  }

  static saveCompany(company: Company): void {
    const companies = this.getCompanies();
    const index = companies.findIndex(c => c.id === company.id);
    if (index >= 0) {
      companies[index] = company;
    } else {
      companies.push(company);
    }
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  }

  static deleteCompany(id: string): void {
    const companies = this.getCompanies().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  }

  // Warehouse Management
  static getWarehouses(): Warehouse[] {
    const data = localStorage.getItem(STORAGE_KEYS.WAREHOUSES);
    return data ? JSON.parse(data) : [];
  }

  static getWarehousesByCompany(companyId: string): Warehouse[] {
    return this.getWarehouses().filter(w => w.companyId === companyId);
  }

  static saveWarehouse(warehouse: Warehouse): void {
    const warehouses = this.getWarehouses();
    const index = warehouses.findIndex(w => w.id === warehouse.id);
    if (index >= 0) {
      warehouses[index] = warehouse;
    } else {
      warehouses.push(warehouse);
    }
    localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(warehouses));
  }

  static deleteWarehouse(id: string): void {
    const warehouses = this.getWarehouses().filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(warehouses));
  }

  // Customer Management
  static getCustomers(): Customer[] {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  }

  static saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer;
    } else {
      customers.push(customer);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  static deleteCustomer(id: string): void {
    const customers = this.getCustomers().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  static findCustomerByName(name: string): Customer | undefined {
    return this.getCustomers().find(
      c => c.name.toLowerCase() === name.toLowerCase()
    );
  }
}
