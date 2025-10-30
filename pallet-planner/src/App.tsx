import { useState } from 'react';
import { Package, Database, Building, Users } from 'lucide-react';
import { PalletPlanner } from './components/PalletPlanner';
import { SKULibrary } from './components/SKULibrary';
import { CompanyManagement } from './components/CompanyManagement';
import { CustomerManagement } from './components/CustomerManagement';

type Tab = 'planner' | 'skus' | 'companies' | 'customers';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('planner');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={36} className="text-yellow-400" />
              <div>
                <h1 className="text-3xl font-bold">Pallet Planner</h1>
                <p className="text-gray-300 text-sm">Optimize your pallet loading efficiently</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition border-b-4 ${
                activeTab === 'planner'
                  ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Package size={20} />
              Pallet Planner
            </button>
            <button
              onClick={() => setActiveTab('skus')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition border-b-4 ${
                activeTab === 'skus'
                  ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Database size={20} />
              SKU Library
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition border-b-4 ${
                activeTab === 'companies'
                  ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Building size={20} />
              Companies
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition border-b-4 ${
                activeTab === 'customers'
                  ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users size={20} />
              Customers
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'planner' && <PalletPlanner />}
        {activeTab === 'skus' && <SKULibrary />}
        {activeTab === 'companies' && <CompanyManagement />}
        {activeTab === 'customers' && <CustomerManagement />}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-gray-400 text-sm">
            <p>Pallet Planner © {new Date().getFullYear()} - Optimize your logistics</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
