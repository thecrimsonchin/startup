import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Package } from 'lucide-react';
import type { Order, OrderItem, Company, Customer, SKU, PackingResult, WeightUnit } from '../types';
import { StorageManager } from '../utils/storage';
import { PalletOptimizer } from '../utils/palletOptimizer';
import { ExportUtils } from '../utils/exportUtils';
import { PalletVisualization } from './PalletVisualization';

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
  
  const [packingResult, setPackingResult] = useState<PackingResult | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCompanies(StorageManager.getCompanies());
    setCustomers(StorageManager.getCustomers());
    setSKUs(StorageManager.getSKUs());
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
      maxWeight
    );

    const pallets = optimizer.optimize(orderItems);
    
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
  };

  return (
    <div className="space-y-8">
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
                    {sku.name} ({sku.length}"×{sku.width}"×{sku.height}")
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.sku.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.sku.length}" × {item.sku.width}" × {item.sku.height}"
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.sku.weight} lbs</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.unitType}</td>
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

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={calculatePalletPlan}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition text-lg"
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
    </div>
  );
};
