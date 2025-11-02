import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Download, Package, Upload } from 'lucide-react';
import type {
  Order,
  OrderItem,
  Company,
  Customer,
  SKU,
  PackingResult,
  WeightUnit,
  Pallet
} from '../types';
import { StorageManager } from '../utils/storage';
import { PalletOptimizer } from '../utils/palletOptimizer';
import { ExportUtils } from '../utils/exportUtils';
import { PalletVisualization } from './PalletVisualization';
import {
  parseSalesOrderCSV,
  type ParsedSalesOrder,
  type ParsedSalesOrderItem,
  type ParsedSalesOrderParty
} from '../utils/salesOrderParser';

interface MissingSkuContext {
  parsedItem: ParsedSalesOrderItem;
}

interface MissingSkuFormState {
  id: string;
  name: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  packType: string;
  description: string;
}

const createEmptyMissingSkuForm = (): MissingSkuFormState => ({
  id: '',
  name: '',
  length: '',
  width: '',
  height: '',
  weight: '',
  packType: '',
  description: ''
});

export const PalletPlanner: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [poNumber, setPONumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedSKU, setSelectedSKU] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitType, setUnitType] = useState<'each' | 'case'>('each');
  
  const [palletLength, setPalletLength] = useState<number>(48);
  const [palletWidth, setPalletWidth] = useState<number>(40);
  const [maxHeight, setMaxHeight] = useState<number>(72);
  const [maxWeight, setMaxWeight] = useState<number>(2000);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [missingSkuQueue, setMissingSkuQueue] = useState<MissingSkuContext[]>([]);
  const [activeMissingSku, setActiveMissingSku] = useState<MissingSkuContext | null>(null);
  const [isMissingSkuModalOpen, setIsMissingSkuModalOpen] = useState(false);
  const [missingSkuForm, setMissingSkuForm] = useState<MissingSkuFormState>(createEmptyMissingSkuForm());
  
  const [packingResult, setPackingResult] = useState<PackingResult | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const hasPricing = orderItems.some(item => item.unitPrice !== undefined);
  const orderValue = hasPricing
    ? orderItems.reduce((sum, item) => sum + (item.totalPrice ?? ((item.unitPrice ?? 0) * item.quantity)), 0)
    : 0;
  const hasPendingMissingSkus = Boolean(activeMissingSku || missingSkuQueue.length > 0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCompanies(StorageManager.getCompanies());
    setCustomers(StorageManager.getCustomers());
    setSKUs(StorageManager.getSKUs());
  };

  const resetMissingSkuState = () => {
    setMissingSkuQueue([]);
    setActiveMissingSku(null);
    setIsMissingSkuModalOpen(false);
    setMissingSkuForm(createEmptyMissingSkuForm());
  };

  const openMissingSkuModal = (
    context: MissingSkuContext | null,
    remainingQueue: MissingSkuContext[]
  ) => {
    if (!context) {
      resetMissingSkuState();
      return;
    }

    setActiveMissingSku(context);
    setMissingSkuQueue(remainingQueue);
    setMissingSkuForm({
      id: context.parsedItem.skuId,
      name: context.parsedItem.skuName ?? context.parsedItem.skuId,
      length:
        context.parsedItem.length !== undefined
          ? String(context.parsedItem.length)
          : '',
      width:
        context.parsedItem.width !== undefined
          ? String(context.parsedItem.width)
          : '',
      height:
        context.parsedItem.height !== undefined
          ? String(context.parsedItem.height)
          : '',
      weight:
        context.parsedItem.unitWeight !== undefined
          ? String(context.parsedItem.unitWeight)
          : '',
      packType: context.parsedItem.packType ?? '',
      description: context.parsedItem.description ?? ''
    });
    setIsMissingSkuModalOpen(true);
  };

  const normalizeDateForInput = (value: string): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const matched = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (matched) {
      const [, month, day, year] = matched;
      return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${year}-${month}-${day}`;
    }

    return null;
  };

  const findOrCreateCompanyFromParsed = (party: ParsedSalesOrderParty): Company => {
    const normalizedName = party.name.trim().toLowerCase();
    const existing = companies.find(
      company => company.name.trim().toLowerCase() === normalizedName
    );

    if (existing) {
      return existing;
    }

    const company: Company = {
      id: `COMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: party.name,
      address: party.address,
      city: party.city,
      state: party.state,
      zip: party.zip,
      phone: party.phone,
      email: party.email
    };

    StorageManager.saveCompany(company);
    setCompanies(prev => [...prev, company]);

    return company;
  };

  const findOrCreateCustomerFromParsed = (party: ParsedSalesOrderParty): Customer => {
    const normalizedName = party.name.trim().toLowerCase();
    const existing = customers.find(
      customer => customer.name.trim().toLowerCase() === normalizedName
    );

    if (existing) {
      return existing;
    }

    const customer: Customer = {
      id: `CUST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: party.name,
      address: party.address,
      city: party.city,
      state: party.state,
      zip: party.zip,
      phone: party.phone,
      email: party.email
    };

    StorageManager.saveCustomer(customer);
    setCustomers(prev => [...prev, customer]);

    return customer;
  };

  const findExistingSku = (parsedItem: ParsedSalesOrderItem): SKU | undefined => {
    const normalizedId = parsedItem.skuId.trim().toLowerCase();
    let sku = skus.find(item => item.id.trim().toLowerCase() === normalizedId);

    if (!sku && parsedItem.skuName) {
      const normalizedName = parsedItem.skuName.trim().toLowerCase();
      sku = skus.find(item => item.name.trim().toLowerCase() === normalizedName);
    }

    return sku;
  };

  const buildOrderItemsFromParsed = (
    parsedItems: ParsedSalesOrderItem[]
  ): { items: OrderItem[]; missing: MissingSkuContext[] } => {
    type AggregatedItem = {
      sku: SKU;
      unitType: OrderItem['unitType'];
      quantity: number;
      unitPrice?: number;
      pricingSum: number;
    };

    const aggregatedMap = new Map<string, AggregatedItem>();
    const missingMap = new Map<string, MissingSkuContext>();

    parsedItems.forEach(parsedItem => {
      const existingSku = findExistingSku(parsedItem);
      const baseKey = parsedItem.skuId.trim().toLowerCase();

      if (existingSku) {
        const aggregateKey = `${existingSku.id.toLowerCase()}::${parsedItem.unitType}`;
        const contribution =
          parsedItem.unitPrice !== undefined
            ? parsedItem.unitPrice * parsedItem.quantity
            : 0;

        if (aggregatedMap.has(aggregateKey)) {
          const aggregate = aggregatedMap.get(aggregateKey)!;
          aggregate.quantity += parsedItem.quantity;

          if (parsedItem.unitPrice !== undefined) {
            aggregate.unitPrice = parsedItem.unitPrice;
            aggregate.pricingSum += contribution;
          }
        } else {
          aggregatedMap.set(aggregateKey, {
            sku: existingSku,
            unitType: parsedItem.unitType,
            quantity: parsedItem.quantity,
            unitPrice: parsedItem.unitPrice,
            pricingSum: contribution
          });
        }
      } else {
        const missingKey = `${baseKey}::${parsedItem.unitType}`;
        const existingMissing = missingMap.get(missingKey);

        if (existingMissing) {
          existingMissing.parsedItem.quantity += parsedItem.quantity;

          if (parsedItem.unitPrice !== undefined) {
            existingMissing.parsedItem.unitPrice = parsedItem.unitPrice;
          }

          if (parsedItem.unitWeight !== undefined) {
            existingMissing.parsedItem.unitWeight = parsedItem.unitWeight;
          }

          if (existingMissing.parsedItem.length === undefined && parsedItem.length !== undefined) {
            existingMissing.parsedItem.length = parsedItem.length;
          }

          if (existingMissing.parsedItem.width === undefined && parsedItem.width !== undefined) {
            existingMissing.parsedItem.width = parsedItem.width;
          }

          if (existingMissing.parsedItem.height === undefined && parsedItem.height !== undefined) {
            existingMissing.parsedItem.height = parsedItem.height;
          }

          if (!existingMissing.parsedItem.packType && parsedItem.packType) {
            existingMissing.parsedItem.packType = parsedItem.packType;
          }

          if (!existingMissing.parsedItem.description && parsedItem.description) {
            existingMissing.parsedItem.description = parsedItem.description;
          }

          if (!existingMissing.parsedItem.skuName && parsedItem.skuName) {
            existingMissing.parsedItem.skuName = parsedItem.skuName;
          }
        } else {
          missingMap.set(missingKey, {
            parsedItem: { ...parsedItem }
          });
        }
      }
    });

    const items: OrderItem[] = Array.from(aggregatedMap.values()).map(aggregate => ({
      sku: aggregate.sku,
      quantity: aggregate.quantity,
      unitType: aggregate.unitType,
      unitPrice: aggregate.unitPrice,
      totalPrice:
        aggregate.pricingSum > 0
          ? aggregate.pricingSum
          : aggregate.unitPrice !== undefined
            ? aggregate.unitPrice * aggregate.quantity
            : undefined
    }));

    const missing = Array.from(missingMap.values());

    return { items, missing };
  };

  const applyParsedSalesOrder = (parsed: ParsedSalesOrder) => {
    setPackingResult(null);
    setOrder(null);

    const company = findOrCreateCompanyFromParsed(parsed.from);
    setSelectedCompany(company);

    const customer = findOrCreateCustomerFromParsed(parsed.to);
    setSelectedCustomer(customer);

    if (parsed.poNumber) {
      setPONumber(parsed.poNumber);
    }

    if (parsed.orderDate) {
      const normalizedDate = normalizeDateForInput(parsed.orderDate);
      if (normalizedDate) {
        setOrderDate(normalizedDate);
      }
    }

    const { items, missing } = buildOrderItemsFromParsed(parsed.items);
    setOrderItems(items);

    if (missing.length > 0) {
      const [first, ...rest] = missing;
      openMissingSkuModal(first, rest);
      setUploadError('Some SKUs were not found. Please provide details to add them to the library.');
    } else {
      resetMissingSkuState();
      setUploadError(null);
    }
  };

  const handleSalesOrderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError(null);
    setIsProcessingUpload(true);

    try {
      const content = await file.text();
      const parsed = parseSalesOrderCSV(content);
      applyParsedSalesOrder(parsed);
    } catch (error) {
      console.error(error);
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Failed to parse the uploaded sales order. Please verify the file format.'
      );
      resetMissingSkuState();
    } finally {
      setIsProcessingUpload(false);
      event.target.value = '';
    }
  };

  const triggerSalesOrderUpload = () => {
    fileInputRef.current?.click();
  };

  const handleMissingSkuChange = (field: keyof MissingSkuFormState, value: string) => {
    setMissingSkuForm(prev => ({ ...prev, [field]: value }));
  };

  const handleMissingSkuSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeMissingSku) {
      return;
    }

    const length = Number(missingSkuForm.length);
    const width = Number(missingSkuForm.width);
    const height = Number(missingSkuForm.height);
    const weight = Number(missingSkuForm.weight);
    const packType = missingSkuForm.packType.trim();

    if (
      !Number.isFinite(length) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      !Number.isFinite(weight) ||
      length <= 0 ||
      width <= 0 ||
      height <= 0 ||
      weight <= 0
    ) {
      alert('Please provide positive numeric values for length, width, height, and weight.');
      return;
    }

    if (!packType) {
      alert('Pack type is required.');
      return;
    }

    const skuId = (missingSkuForm.id || activeMissingSku.parsedItem.skuId).trim();
    const skuName =
      missingSkuForm.name.trim() ||
      activeMissingSku.parsedItem.skuName ||
      skuId;

    const newSku: SKU = {
      id: skuId,
      name: skuName,
      length,
      width,
      height,
      weight,
      packType,
      description: missingSkuForm.description.trim() || activeMissingSku.parsedItem.description || ''
    };

    StorageManager.saveSKU(newSku);
    setSKUs(prev => {
      const filtered = prev.filter(sku => sku.id.trim().toLowerCase() !== newSku.id.trim().toLowerCase());
      return [...filtered, newSku];
    });

    setOrderItems(prev => {
      const updated = [...prev];
      updated.push({
        sku: newSku,
        quantity: activeMissingSku.parsedItem.quantity,
        unitType: activeMissingSku.parsedItem.unitType,
        unitPrice: activeMissingSku.parsedItem.unitPrice,
        totalPrice:
          activeMissingSku.parsedItem.unitPrice !== undefined
            ? activeMissingSku.parsedItem.unitPrice * activeMissingSku.parsedItem.quantity
            : undefined
      });
      return updated;
    });

    if (missingSkuQueue.length > 0) {
      const [next, ...rest] = missingSkuQueue;
      openMissingSkuModal(next, rest);
    } else {
      resetMissingSkuState();
      setUploadError(null);
    }
  };

  const formatDateToMMDDYYYY = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}${day}${year}`;
  };

  const addOrderItem = () => {
    if (!selectedSKU) return;
    
    const sku = skus.find(s => s.id === selectedSKU);
    if (!sku) return;

    const existingIndex = orderItems.findIndex(
      item => item.sku.id === sku.id && item.unitType === unitType
    );

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += quantity;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, { sku, quantity, unitType }]);
    }

    setSelectedSKU('');
    setQuantity(1);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculatePalletPlan = () => {
    if (!selectedCompany || !selectedCustomer || !poNumber || orderItems.length === 0) {
      alert('Please fill in all required fields and add at least one item.');
      return;
    }

    if (hasPendingMissingSkus) {
      alert('Please complete the missing SKU details before calculating the pallet plan.');
      return;
    }

    const currentOrder: Order = {
      poNumber,
      date: formatDateToMMDDYYYY(orderDate),
      company: selectedCompany,
      customer: selectedCustomer,
      recipient: {
        name: selectedCustomer.name,
        address: selectedCustomer.address,
        city: selectedCustomer.city,
        state: selectedCustomer.state,
        zip: selectedCustomer.zip
      },
      items: orderItems,
      palletSize: { length: palletLength, width: palletWidth },
      maxPalletHeight: maxHeight,
      maxPalletWeight: maxWeight,
      weightUnit
    };

    const optimizer = new PalletOptimizer(
      { length: palletLength, width: palletWidth },
      maxHeight,
      maxWeight,
      weightUnit
    );

    let pallets: Pallet[];

    try {
      pallets = optimizer.optimize(orderItems);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to optimize pallet plan. Please review your inputs.';
      alert(message);
      return;
    }
    
    const totalWeight = pallets.reduce((sum, p) => sum + p.totalWeight, 0);
    const totalHeight = pallets.reduce((sum, p) => sum + p.totalHeight, 0);

    const result: PackingResult = {
      pallets,
      totalPallets: pallets.length,
      totalWeight,
      totalHeight,
      unplacedItems: []
    };

    setOrder(currentOrder);
    setPackingResult(result);
  };

  const exportFile = (format: 'csv' | 'json' | 'pdf' | 'txt' | 'xlsx') => {
    if (!order || !packingResult) return;

    const exporter = new ExportUtils(order, packingResult);
    
    switch (format) {
      case 'csv':
        exporter.exportCSV();
        break;
      case 'json':
        exporter.exportJSON();
        break;
      case 'pdf':
        exporter.exportPDF();
        break;
      case 'txt':
        exporter.exportTXT();
        break;
      case 'xlsx':
        exporter.exportXLSX();
        break;
    }
  };

  const resetForm = () => {
    setSelectedCompany(null);
    setSelectedCustomer(null);
    setPONumber('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderItems([]);
    setPackingResult(null);
    setOrder(null);
    resetMissingSkuState();
    setUploadError(null);
  };

  return (
    <div className="space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleSalesOrderUpload}
        className="hidden"
      />

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Package size={28} />
          Create Pallet Plan
        </h2>

        {/* Order Information */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company *
            </label>
            <select
              value={selectedCompany?.id || ''}
              onChange={(e) => {
                const company = companies.find(c => c.id === e.target.value);
                setSelectedCompany(company || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Select Company</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer *
            </label>
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const customer = customers.find(c => c.id === e.target.value);
                setSelectedCustomer(customer || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PO Number *
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPONumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Enter PO Number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Date *
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>

        {/* Pallet Configuration */}
        <div className="border-t pt-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pallet Configuration</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pallet Length (in)
              </label>
              <input
                type="number"
                value={palletLength}
                onChange={(e) => setPalletLength(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pallet Width (in)
              </label>
              <input
                type="number"
                value={palletWidth}
                onChange={(e) => setPalletWidth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Height (in)
              </label>
              <input
                type="number"
                value={maxHeight}
                onChange={(e) => setMaxHeight(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Weight
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Order Upload */}
        <div className="border-t pt-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Order Upload</h3>
          {uploadError && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {uploadError}
            </div>
          )}
          {hasPendingMissingSkus && !activeMissingSku && (
            <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
              Complete the missing SKU details to finish importing this sales order.
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <button
              onClick={triggerSalesOrderUpload}
              disabled={isProcessingUpload}
              className={`flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg transition ${isProcessingUpload ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Upload size={20} />
              {isProcessingUpload ? 'Processing...' : 'Upload Sales Order CSV'}
            </button>
            <p className="text-sm text-gray-600">
              Required columns: from_* and to_* address fields, sku, quantity, optional unit_price, unit_type, length, width, height, pack_type.
            </p>
          </div>
        </div>

        {/* Add Items */}
        <div className="border-t pt-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Items</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select SKU
              </label>
              <select
                value={selectedSKU}
                onChange={(e) => setSelectedSKU(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">Choose SKU</option>
                {skus.map(sku => (
                  <option key={sku.id} value={sku.id}>
                    {sku.name} ({sku.length}" x {sku.width}" x {sku.height}")
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Type
              </label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as 'each' | 'case')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="each">Each</option>
                <option value="case">Case</option>
              </select>
            </div>
            <button
              onClick={addOrderItem}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg transition"
            >
              <Plus size={20} />
              Add
            </button>
          </div>
        </div>

        {/* Order Items Table */}
        {orderItems.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Dimensions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Unit</th>
                    {hasPricing && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Unit Price</th>
                    )}
                    {hasPricing && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Line Total</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.sku.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.sku.length}" x {item.sku.width}" x {item.sku.height}"
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.sku.weight} lbs</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.unitType}</td>
                      {hasPricing && (
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.unitPrice !== undefined ? `$${item.unitPrice.toFixed(2)}` : 'N/A'}
                        </td>
                      )}
                      {hasPricing && (
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.totalPrice !== undefined || item.unitPrice !== undefined
                            ? `$${(item.totalPrice ?? (item.unitPrice ?? 0) * item.quantity).toFixed(2)}`
                            : 'N/A'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => removeOrderItem(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasPricing && (
          <div className="border-t pt-4 mb-6 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-600">Order Value</div>
              <div className="text-2xl font-semibold text-gray-900">${orderValue.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={calculatePalletPlan}
            disabled={hasPendingMissingSkus}
            className={`flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition text-lg ${hasPendingMissingSkus ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Calculate Pallet Plan
          </button>
          <button
            onClick={resetForm}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-lg transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Results */}
      {packingResult && order && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Pallet Plan Summary</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-gray-600 mb-1">Total Pallets</div>
                <div className="text-3xl font-bold text-gray-900">{packingResult.totalPallets}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-gray-600 mb-1">Total Weight</div>
                <div className="text-3xl font-bold text-gray-900">
                  {packingResult.totalWeight.toFixed(1)} {weightUnit}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-gray-600 mb-1">Average Height</div>
                <div className="text-3xl font-bold text-gray-900">
                  {(packingResult.totalHeight / packingResult.totalPallets).toFixed(1)}"
                </div>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Download size={24} />
              Export Options
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => exportFile('csv')}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                CSV
              </button>
              <button
                onClick={() => exportFile('json')}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                JSON
              </button>
              <button
                onClick={() => exportFile('pdf')}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                PDF
              </button>
              <button
                onClick={() => exportFile('txt')}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                TXT
              </button>
              <button
                onClick={() => exportFile('xlsx')}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                XLSX
              </button>
            </div>
          </div>

          {/* Detailed Pallet Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Pallet Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Pallet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Layers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Height</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Freight Class</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {packingResult.pallets.map(pallet => (
                    <tr key={pallet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        Pallet {pallet.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pallet.layers.length}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pallet.totalHeight.toFixed(1)}"</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {pallet.totalWeight.toFixed(1)} {weightUnit}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pallet.freightClass || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visualizations */}
          {packingResult.pallets.map(pallet => (
            <div key={pallet.id} className="bg-white rounded-lg shadow-md p-6">
              <PalletVisualization pallet={pallet} />
            </div>
          ))}
        </div>
      )}
      {isMissingSkuModalOpen && activeMissingSku && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Provide Missing SKU Details</h3>
            <p className="text-sm text-gray-600 mb-4">
              SKU <span className="font-semibold">{activeMissingSku.parsedItem.skuId}</span> is not in your library. Enter the required details so it can be included in the pallet plan.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-6 text-sm text-gray-700">
              <div>
                <span className="block text-gray-500">Quantity</span>
                <span className="font-semibold">{activeMissingSku.parsedItem.quantity}</span>
              </div>
              <div>
                <span className="block text-gray-500">Unit Type</span>
                <span className="font-semibold capitalize">{activeMissingSku.parsedItem.unitType}</span>
              </div>
              <div>
                <span className="block text-gray-500">Unit Price</span>
                <span className="font-semibold">
                  {activeMissingSku.parsedItem.unitPrice !== undefined
                    ? `$${activeMissingSku.parsedItem.unitPrice.toFixed(2)}`
                    : 'Not provided'}
                </span>
              </div>
            </div>

            <form onSubmit={handleMissingSkuSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU ID *</label>
                  <input
                    type="text"
                    value={missingSkuForm.id}
                    onChange={(e) => handleMissingSkuChange('id', e.target.value)}
                    placeholder={activeMissingSku.parsedItem.skuId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU Name *</label>
                  <input
                    type="text"
                    value={missingSkuForm.name}
                    onChange={(e) => handleMissingSkuChange('name', e.target.value)}
                    placeholder={activeMissingSku.parsedItem.skuName ?? 'SKU Name'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length (in) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={missingSkuForm.length}
                    onChange={(e) => handleMissingSkuChange('length', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width (in) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={missingSkuForm.width}
                    onChange={(e) => handleMissingSkuChange('width', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (in) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={missingSkuForm.height}
                    onChange={(e) => handleMissingSkuChange('height', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Weight (lbs) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={missingSkuForm.weight}
                    onChange={(e) => handleMissingSkuChange('weight', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pack Type *</label>
                  <input
                    type="text"
                    value={missingSkuForm.packType}
                    onChange={(e) => handleMissingSkuChange('packType', e.target.value)}
                    placeholder={activeMissingSku.parsedItem.packType ?? 'e.g., Case'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={missingSkuForm.description}
                  onChange={(e) => handleMissingSkuChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder={activeMissingSku.parsedItem.description ?? 'Optional notes'}
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg transition"
                >
                  Save SKU and Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
