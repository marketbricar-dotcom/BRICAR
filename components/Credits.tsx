import React, { useState } from 'react';
import { Sale, PaymentMethod, Currency } from '../types';
import { Users, DollarSign, Calendar, CheckCircle, Search, CreditCard } from 'lucide-react';

interface Props {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
}

const Credits: React.FC<Props> = ({ sales, setSales }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only Credit sales
  const creditSales = sales.filter(s => s.paymentMethod === PaymentMethod.CREDITO);
  
  // Apply Search Filter
  const filteredCredits = creditSales.filter(s => 
    s.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate Totals
  const totalPendingUSD = creditSales.reduce((acc, s) => acc + s.totalUSD, 0);
  const totalPendingBsF = creditSales.reduce((acc, s) => acc + s.totalBsF, 0);

  const handleSettleDebt = (sale: Sale) => {
    const method = prompt(
        `SALDAR DEUDA DE: ${sale.customerName}\n\nMonto: $${sale.totalUSD.toFixed(2)}\n\n¿Cómo pagó el cliente? Escribe el número:\n1. Efectivo USD\n2. Pago Móvil\n3. Punto de Venta\n4. Efectivo BsF`
    );

    let newMethod: PaymentMethod | null = null;

    switch(method) {
        case '1': newMethod = PaymentMethod.EFECTIVO_USD; break;
        case '2': newMethod = PaymentMethod.PAGO_MOVIL; break;
        case '3': newMethod = PaymentMethod.PUNTO_VENTA; break;
        case '4': newMethod = PaymentMethod.EFECTIVO_BSF; break;
        default: return; // Cancelled
    }

    if (newMethod) {
        let reference = undefined;
        if (newMethod === PaymentMethod.PAGO_MOVIL) {
            reference = prompt("Ingresa los últimos 4 dígitos de la referencia:") || 'S/R';
        }

        setSales(prev => prev.map(s => {
            if (s.id === sale.id) {
                return {
                    ...s,
                    paymentMethod: newMethod as PaymentMethod,
                    paymentReference: reference,
                    timestamp: Date.now() // Update date to now? Or keep original? Let's keep original for record but maybe user wants to update. For simplicity, we keep original sale ID but update method.
                };
            }
            return s;
        }));
        alert(`Deuda de ${sale.customerName} marcada como PAGADA (${newMethod}).`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 rounded-full bg-orange-50 text-orange-600">
                <Users className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">Clientes Deudores</p>
                <h3 className="text-2xl font-bold text-slate-800">{creditSales.length}</h3>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 rounded-full bg-red-50 text-red-600">
                <DollarSign className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">Por Cobrar (USD)</p>
                <h3 className="text-2xl font-bold text-slate-800">${totalPendingUSD.toFixed(2)}</h3>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 rounded-full bg-slate-50 text-slate-600">
                <span className="text-xl font-bold">Bs</span>
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">Por Cobrar (BsF)</p>
                <h3 className="text-2xl font-bold text-slate-800">{totalPendingBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</h3>
            </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-lg">Cuentas por Cobrar</h2>
            </div>
            
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar cliente..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0">
                    <tr>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Fecha Venta</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Productos</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Total Deuda</th>
                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredCredits.map(sale => (
                        <tr key={sale.id} className="hover:bg-slate-50">
                            <td className="p-4 align-top">
                                <div className="font-bold text-slate-800">{sale.customerName || 'Sin Nombre'}</div>
                                <div className="text-xs text-slate-400">ID: {sale.id.slice(0, 8)}</div>
                            </td>
                            <td className="p-4 text-slate-600 align-top">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    {new Date(sale.timestamp).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-slate-400 pl-6">
                                    {new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </td>
                            <td className="p-4 text-slate-600 align-top">
                                <div className="flex flex-col gap-1">
                                    {sale.items.map((item, idx) => (
                                        <div key={idx} className="text-sm">
                                            <span className="font-bold text-slate-800">{item.quantity}</span> x {item.name}
                                        </div>
                                    ))}
                                </div>
                            </td>
                            <td className="p-4 align-top">
                                <div className="font-bold text-red-600">${sale.totalUSD.toFixed(2)}</div>
                                <div className="text-xs text-red-500">{sale.totalBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })} BsF</div>
                            </td>
                            <td className="p-4 text-right align-top">
                                <button 
                                    onClick={() => handleSettleDebt(sale)}
                                    className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium text-sm inline-flex items-center gap-2 transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Saldar
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredCredits.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-400">
                                <div className="flex flex-col items-center justify-center">
                                    <CheckCircle className="w-12 h-12 mb-4 text-slate-200" />
                                    <p className="text-lg">No hay deudas pendientes</p>
                                    <p className="text-sm">Todas las cuentas están al día.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Credits;