import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import type { SKU } from '../types';
import { StorageManager } from '../utils/storage';

interface SKULibraryProps {
  onSelect?: (sku: SKU) => void;
  selectedSKUs?: string[];
}

export const SKULibrary: React.FC<SKULibraryProps> = ({ onSelect, selectedSKUs = [] }) => {
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [formData, setFormData] = useState<Partial<SKU>>({});

  useEffect(() => {
    loadSKUs();
  }, []);

  const loadSKUs = () => {
    setSKUs(StorageManager.getSKUs());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const sku: SKU = {
      id: editingSKU?.id || `SKU-${Date.now()}`,
      name: formData.name || '',
      length: Number(formData.length) || 0,
      width: Number(formData.width) || 0,
      height: Number(formData.height) || 0,
      weight: Number(formData.weight) || 0,
      packType: formData.packType || '',
      description: formData.description || ''
    };

    StorageManager.saveSKU(sku);
    loadSKUs();
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this SKU?')) {
      StorageManager.deleteSKU(id);
      loadSKUs();
    }
  };

  const openModal = (sku?: SKU) => {
    if (sku) {
      setEditingSKU(sku);
      setFormData(sku);
    } else {
      setEditingSKU(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSKU(null);
    setFormData({});
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">SKU Library</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg transition"
        >
          <Plus size={20} />
          Add SKU
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                SKU ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Dimensions (L×W×H)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Weight
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Pack Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {skus.map(sku => (
              <tr 
                key={sku.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedSKUs.includes(sku.id) ? 'bg-yellow-50' : ''}`}
                onClick={() => onSelect && onSelect(sku)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {sku.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sku.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sku.length}" × {sku.width}" × {sku.height}"
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sku.weight} lbs
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sku.packType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(sku);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sku.id);
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {skus.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No SKUs in library. Click "Add SKU" to create one.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">
                {editingSKU ? 'Edit SKU' : 'Add New SKU'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Length (in) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.length || ''}
                    onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (in) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.width || ''}
                    onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (in) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.height || ''}
                    onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (lbs) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pack Type *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Box, Pallet, Crate"
                  value={formData.packType || ''}
                  onChange={(e) => setFormData({ ...formData, packType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg transition"
                >
                  {editingSKU ? 'Update SKU' : 'Add SKU'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
