import React, { useState, useEffect } from 'react';
import ExchangeRate from './components/ExchangeRate';
import Inventory from './components/Inventory';
import SalesSystem from './components/SalesSystem';
import Reports from './components/Reports';
import AIAssistant from './components/AIAssistant';
import Credits from './components/Credits';
import { Product, Sale } from './types';
import { LayoutDashboard, ShoppingCart, Package, BrainCircuit, Calculator, Store, Users } from 'lucide-react';

const App: React.FC = () => {
  // --- Persistent State ---
  const [rate, setRate] = useState<number>(() => {
    const saved = localStorage.getItem('venstore_rate');
    return saved ? parseFloat(saved) : 36.5; // Default fallback
  });

  const [inventory, setInventory] = useState<Product[]>(() => {
    const saved = localStorage.getItem('venstore_inventory');
    return saved ? JSON.parse(saved) : [];
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('venstore_sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'RATE' | 'INVENTORY' | 'SALES' | 'REPORTS' | 'AI' | 'CREDITS'>('SALES');
  const [logoError, setLogoError] = useState(false);

  // --- Effects for Persistence ---
  useEffect(() => {
    localStorage.setItem('venstore_rate', rate.toString());
  }, [rate]);

  useEffect(() => {
    localStorage.setItem('venstore_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('venstore_sales', JSON.stringify(sales));
  }, [sales]);

  // --- Handlers ---
  const handleProcessSale = (sale: Sale, updatedInventory: Product[]) => {
    setSales(prev => [...prev, sale]);
    setInventory(updatedInventory);
  };

  const handleUndoLastSale = () => {
    if (sales.length === 0) return;
    
    if (!confirm('¿Deshacer la última venta? Los productos volverán al inventario.')) return;

    const lastSale = sales[sales.length - 1];
    const updatedInventory = [...inventory];
    let restoredCount = 0;

    lastSale.items.forEach(item => {
        if (!item.isManual && item.productId) {
            const idx = updatedInventory.findIndex(p => p.id === item.productId);
            if (idx > -1) {
                updatedInventory[idx].stock += item.quantity;
                restoredCount++;
            }
        }
    });

    setInventory(updatedInventory);
    setSales(prev => prev.slice(0, -1)); // Remove last
    alert(`Última venta deshecha. Se ha restaurado el stock.`);
  };

  const NavButton = ({ id, label, icon: Icon, active }: { id: string, label: string, icon: any, active: boolean }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
        active 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        
        {/* Header Section */}
        <header className="mb-8 flex flex-col items-center justify-center">
          {!logoError ? (
            <img 
              src="./logo.png" 
              alt="Mini Market Bricar" 
              className="h-auto max-h-48 object-contain drop-shadow-sm transition-opacity duration-500"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="text-center flex flex-col items-center animate-fade-in">
              <div className="bg-blue-100 p-4 rounded-full mb-3 shadow-inner">
                <Store className="w-12 h-12 text-blue-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight mb-2 uppercase drop-shadow-sm">
                Mini Market Bricar
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                Sistema de Gestión de Inventario y Ventas
              </p>
            </div>
          )}
        </header>

        {/* Navigation Bar */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
            <NavButton id="RATE" label="Calculadora" icon={Calculator} active={activeTab === 'RATE'} />
            <NavButton id="INVENTORY" label="Inventario" icon={Package} active={activeTab === 'INVENTORY'} />
            <NavButton id="SALES" label="Ventas" icon={ShoppingCart} active={activeTab === 'SALES'} />
            <NavButton id="CREDITS" label="Créditos" icon={Users} active={activeTab === 'CREDITS'} />
            <NavButton id="REPORTS" label="Reportes" icon={LayoutDashboard} active={activeTab === 'REPORTS'} />
            <NavButton id="AI" label="Asistente IA" icon={BrainCircuit} active={activeTab === 'AI'} />
        </div>

        {/* Dynamic Content */}
        <div className="animate-fade-in-up">
            {activeTab === 'RATE' && (
                <ExchangeRate rate={rate} onUpdateRate={setRate} />
            )}

            {activeTab === 'INVENTORY' && (
                <Inventory inventory={inventory} setInventory={setInventory} rate={rate} />
            )}

            {activeTab === 'SALES' && (
                <SalesSystem 
                    inventory={inventory} 
                    rate={rate} 
                    onProcessSale={handleProcessSale} 
                    onUndoLastSale={handleUndoLastSale}
                />
            )}

            {activeTab === 'CREDITS' && (
                <Credits sales={sales} setSales={setSales} />
            )}

            {activeTab === 'REPORTS' && (
                <Reports 
                  sales={sales} 
                  setSales={setSales} 
                  inventory={inventory} 
                  setInventory={setInventory} 
                />
            )}

            {activeTab === 'AI' && (
                <AIAssistant storeData={{ exchangeRate: rate, inventory, sales }} />
            )}
        </div>
      </div>
      
      <footer className="py-6 text-center text-slate-400 text-xs mt-8 border-t border-slate-200">
          <p>© {new Date().getFullYear()} Mini Market Bricar. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default App;