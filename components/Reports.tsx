import React, { useState } from 'react';
import { Sale, PaymentMethod, Product, CartItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Download, Trash2, Edit, Save, X, CreditCard } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  inventory: Product[];
  setInventory: React.Dispatch<React.SetStateAction<Product[]>>;
}

type TimeRange = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const Reports: React.FC<Props> = ({ sales, setSales, inventory, setInventory }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('DAILY');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [itemsToRestore, setItemsToRestore] = useState<CartItem[]>([]);

  // Helper functions
  const getStartOfDay = (d: Date) => {
    const newD = new Date(d);
    newD.setHours(0,0,0,0);
    return newD;
  };

  const getStartOfWeek = (d: Date) => {
    const newD = new Date(d);
    newD.setHours(0,0,0,0);
    const day = newD.getDay() || 7; // Get current day number, make Sunday (0) -> 7
    if (day !== 1) newD.setHours(-24 * (day - 1)); // Go back to Monday
    return newD;
  };

  const getStartOfMonth = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  const now = new Date();
  let filteredSales: Sale[] = [];
  let periodLabel = '';
  
  if (timeRange === 'DAILY') {
      const start = getStartOfDay(now);
      filteredSales = sales.filter(s => s.timestamp >= start.getTime());
      periodLabel = 'Hoy';
  } else if (timeRange === 'WEEKLY') {
      const start = getStartOfWeek(now);
      filteredSales = sales.filter(s => s.timestamp >= start.getTime());
      periodLabel = 'Esta Semana';
  } else {
      const start = getStartOfMonth(now);
      filteredSales = sales.filter(s => s.timestamp >= start.getTime());
      periodLabel = 'Este Mes';
  }
  
  const totalUSD = filteredSales.reduce((acc, s) => acc + s.totalUSD, 0);
  const totalBsF = filteredSales.reduce((acc, s) => acc + s.totalBsF, 0);
  
  // Chart Data Preparation
  const chartData = [];

  if (timeRange === 'DAILY') {
      // Show Last 7 Days for daily view trend
      for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        const dayStr = d.toLocaleDateString('es-ES', { weekday: 'short' });
        
        const daySales = sales.filter(s => {
            const sDate = new Date(s.timestamp);
            sDate.setHours(0,0,0,0);
            return sDate.getTime() === d.getTime();
        });

        chartData.push({
            name: dayStr,
            usd: daySales.reduce((acc, s) => acc + s.totalUSD, 0)
        });
      }
  } else if (timeRange === 'WEEKLY') {
      // Show last 4 weeks
      for(let i=3; i>=0; i--) {
          const d = getStartOfWeek(new Date());
          d.setDate(d.getDate() - (i * 7));
          const nextWeek = new Date(d);
          nextWeek.setDate(nextWeek.getDate() + 7);

          const weekStr = `Sem ${getStartOfWeek(d).getDate()}`; // Start date of week
          
          const weekSales = sales.filter(s => s.timestamp >= d.getTime() && s.timestamp < nextWeek.getTime());

          chartData.push({
            name: weekStr,
            usd: weekSales.reduce((acc, s) => acc + s.totalUSD, 0)
          });
      }
  } else {
      // Show last 6 months
      for(let i=5; i>=0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          const monthStr = d.toLocaleDateString('es-ES', { month: 'short' });

          const monthSales = sales.filter(s => s.timestamp >= d.getTime() && s.timestamp < nextMonth.getTime());

           chartData.push({
            name: monthStr,
            usd: monthSales.reduce((acc, s) => acc + s.totalUSD, 0)
          });
      }
  }

  // Calculate Summary by Payment Method
  const salesByMethod = filteredSales.reduce((acc, sale) => {
    const method = sale.paymentMethod;
    if (!acc[method]) {
      acc[method] = { count: 0, usd: 0, bsf: 0 };
    }
    acc[method].count += 1;
    acc[method].usd += sale.totalUSD;
    acc[method].bsf += sale.totalBsF;
    return acc;
  }, {} as Record<string, { count: number, usd: number, bsf: number }>);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(`Reporte de Ventas - Mini Market Bricar`, 14, 20);
    
    // Subtitle / Period
    doc.setFontSize(12);
    doc.text(`Periodo: ${periodLabel}`, 14, 28);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 34);

    // Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 40, 180, 25, 'FD');
    
    doc.setFontSize(10);
    doc.text(`Total Ventas: ${filteredSales.length}`, 20, 50);
    doc.text(`Total USD: $${totalUSD.toFixed(2)}`, 20, 60);
    doc.text(`Total BsF: ${totalBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })} BsF`, 100, 60);

    // Table
    const tableData = filteredSales.map(sale => [
        `${new Date(sale.timestamp).toLocaleDateString()} ${new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        sale.paymentMethod,
        `$${sale.totalUSD.toFixed(2)}`,
        `${sale.totalBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })} BsF`,
        sale.items.map(i => `${i.quantity} x ${i.name}`).join(', ') // Formato detallado para PDF
    ]);

    autoTable(doc, {
        startY: 75,
        head: [['Fecha', 'Método', 'USD', 'BsF', 'Productos']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }, // Blue-600
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 25 }, // Fecha
            1: { cellWidth: 25 }, // Método
            2: { cellWidth: 20 }, // USD
            3: { cellWidth: 30 }, // BsF
            4: { cellWidth: 'auto' } // Productos
        }
    });

    doc.save(`reporte_ventas_${new Date().getTime()}.pdf`);
  };

  const handleDeleteSale = (saleId: string) => {
      const saleToDelete = sales.find(s => s.id === saleId);
      if (!saleToDelete) return;

      const confirmDelete = confirm('¿Estás seguro de eliminar esta venta?\n\nAceptar: Eliminar venta y restaurar stock.\nCancelar: No hacer nada.');
      
      if (confirmDelete) {
          // Restore Stock Logic
          const updatedInventory = [...inventory];
          let restoredCount = 0;

          saleToDelete.items.forEach(item => {
              if (!item.isManual && item.productId) {
                  const productIndex = updatedInventory.findIndex(p => p.id === item.productId);
                  if (productIndex > -1) {
                      updatedInventory[productIndex].stock += item.quantity;
                      restoredCount++;
                  }
              }
          });

          // Update State
          setInventory(updatedInventory);
          setSales(prev => prev.filter(s => s.id !== saleId));
          alert(`Venta eliminada. Se restauró el stock de ${restoredCount} productos.`);
      }
  };

  const handleOpenEdit = (sale: Sale) => {
      // Deep copy to avoid mutating state directly
      setEditingSale(JSON.parse(JSON.stringify(sale)));
      setItemsToRestore([]);
  }

  const handleRemoveItemFromEdit = (index: number) => {
      if (!editingSale) return;
      
      const itemToRemove = editingSale.items[index];
      const newItems = editingSale.items.filter((_, i) => i !== index);
      
      // Recalculate totals
      const rate = editingSale.rateAtSale;
      let newUSD = 0;
      let newBsF = 0;

      newItems.forEach(item => {
          if (item.currency === 'USD') {
              newUSD += item.price * item.quantity;
              newBsF += (item.price * item.quantity) * rate;
          } else {
              newBsF += item.price * item.quantity;
              newUSD += (item.price * item.quantity) / rate;
          }
      });

      setEditingSale({
          ...editingSale,
          items: newItems,
          totalUSD: newUSD,
          totalBsF: newBsF
      });

      // Track item for stock restoration if it's an inventory product
      if (!itemToRemove.isManual && itemToRemove.productId) {
          setItemsToRestore(prev => [...prev, itemToRemove]);
      }
  };

  const handleUpdateSale = () => {
      if (!editingSale) return;
      
      // 1. Update Inventory if items were removed
      if (itemsToRestore.length > 0) {
          const updatedInventory = [...inventory];
          let restoredCount = 0;

          itemsToRestore.forEach(item => {
              const idx = updatedInventory.findIndex(p => p.id === item.productId);
              if (idx > -1) {
                  updatedInventory[idx].stock += item.quantity;
                  restoredCount++;
              }
          });
          setInventory(updatedInventory);
      }

      // 2. Update Sale Record
      setSales(prev => prev.map(s => s.id === editingSale.id ? editingSale : s));
      
      setEditingSale(null);
      setItemsToRestore([]);
      alert("Venta actualizada correctamente.");
  };

  return (
    <div className="space-y-6 relative">
      {/* Edit Modal */}
      {editingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Editar Venta</h3>
                      <button onClick={() => setEditingSale(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
                            <select 
                                value={editingSale.paymentMethod}
                                onChange={(e) => setEditingSale({...editingSale, paymentMethod: e.target.value as PaymentMethod})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        {editingSale.paymentMethod === PaymentMethod.PAGO_MOVIL && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Referencia</label>
                                <input 
                                    type="text" 
                                    value={editingSale.paymentReference || ''}
                                    onChange={(e) => setEditingSale({...editingSale, paymentReference: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                      </div>

                      {editingSale.paymentMethod === PaymentMethod.CREDITO && (
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Cliente</label>
                              <input 
                                  type="text" 
                                  value={editingSale.customerName || ''}
                                  onChange={(e) => setEditingSale({...editingSale, customerName: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                          </div>
                      )}
                      
                      <div className="border-t border-slate-100 pt-4">
                          <h4 className="font-semibold text-slate-700 mb-2">Productos Vendidos</h4>
                          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-100 text-slate-500">
                                      <tr>
                                          <th className="px-3 py-2">Producto</th>
                                          <th className="px-3 py-2 text-center">Cant.</th>
                                          <th className="px-3 py-2 text-right">Total</th>
                                          <th className="px-3 py-2 text-center"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {editingSale.items.map((item, idx) => (
                                          <tr key={idx}>
                                              <td className="px-3 py-2 text-slate-700">{item.name}</td>
                                              <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                                              <td className="px-3 py-2 text-right text-slate-600">
                                                  {item.currency === 'USD' ? '$' : 'Bs'}{item.price * item.quantity}
                                              </td>
                                              <td className="px-3 py-2 text-center">
                                                  <button 
                                                    onClick={() => handleRemoveItemFromEdit(idx)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                                    title="Eliminar item y restaurar stock"
                                                  >
                                                      <Trash2 className="w-4 h-4" />
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                              Al eliminar un producto, su stock se restaurará automáticamente al guardar.
                          </div>
                      </div>

                      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                           <span className="font-medium text-blue-800">Nuevos Totales:</span>
                           <div className="text-right">
                               <div className="font-bold text-blue-700">${editingSale.totalUSD.toFixed(2)}</div>
                               <div className="text-xs text-blue-600">Bs {editingSale.totalBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</div>
                           </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                      <button onClick={() => setEditingSale(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancelar</button>
                      <button onClick={handleUpdateSale} className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg flex items-center gap-2">
                          <Save className="w-4 h-4" /> Guardar Cambios
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit">
            <button 
                onClick={() => setTimeRange('DAILY')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${timeRange === 'DAILY' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                Diario
            </button>
            <button 
                onClick={() => setTimeRange('WEEKLY')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${timeRange === 'WEEKLY' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                Semanal
            </button>
            <button 
                onClick={() => setTimeRange('MONTHLY')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${timeRange === 'MONTHLY' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                Mensual
            </button>
        </div>

        <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
        >
            <Download className="w-4 h-4" />
            Descargar Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Summary Cards */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
             <div className="p-4 rounded-full bg-blue-50 text-blue-600">
                 <TrendingUp className="w-6 h-6" />
             </div>
             <div>
                 <p className="text-sm text-slate-500 font-medium">Ventas ({periodLabel})</p>
                 <h3 className="text-2xl font-bold text-slate-800">{filteredSales.length}</h3>
             </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
             <div className="p-4 rounded-full bg-green-50 text-green-600">
                 <DollarSign className="w-6 h-6" />
             </div>
             <div>
                 <p className="text-sm text-slate-500 font-medium">Total USD ({periodLabel})</p>
                 <h3 className="text-2xl font-bold text-slate-800">${totalUSD.toFixed(2)}</h3>
             </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
             <div className="p-4 rounded-full bg-amber-50 text-amber-600">
                 <span className="text-xl font-bold">Bs</span>
             </div>
             <div>
                 <p className="text-sm text-slate-500 font-medium">Total BsF ({periodLabel})</p>
                 <h3 className="text-2xl font-bold text-slate-800">{totalBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</h3>
             </div>
         </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">Desglose por Método de Pago</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(salesByMethod).map(([method, data]) => (
                <div key={method} className="p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="text-sm font-semibold text-slate-600 mb-2">{method}</div>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-lg font-bold text-slate-800">{data.count} <span className="text-xs font-normal text-slate-400">trans.</span></div>
                        </div>
                        <div className="text-right">
                             <div className="text-sm font-bold text-blue-600">${data.usd.toFixed(2)}</div>
                             <div className="text-xs text-slate-500">{data.bsf.toLocaleString('es-VE', { maximumFractionDigits: 2 })} BsF</div>
                        </div>
                    </div>
                </div>
            ))}
             {Object.keys(salesByMethod).length === 0 && (
                 <div className="col-span-full text-center py-4 text-slate-400 italic">
                     No hay datos disponibles para este periodo.
                 </div>
             )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-800">
                Tendencia {timeRange === 'DAILY' ? 'Diaria (Últimos 7 días)' : timeRange === 'WEEKLY' ? 'Semanal (Últimas 4 semanas)' : 'Mensual (Últimos 6 meses)'}
            </h3>
        </div>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => `$${val}`}/>
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="usd" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={timeRange === 'MONTHLY' ? 60 : 40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">
             Últimas Transacciones ({periodLabel})
         </div>
         <div className="max-h-96 overflow-y-auto">
             <table className="w-full text-left">
                 <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                     <tr>
                         <th className="px-4 py-2">Fecha/Hora</th>
                         <th className="px-4 py-2">Método</th>
                         <th className="px-4 py-2">Monto (USD / BsF)</th>
                         <th className="px-4 py-2">Productos</th>
                         <th className="px-4 py-2 text-right">Acciones</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm">
                     {filteredSales.slice().reverse().map(sale => (
                         <tr key={sale.id} className="hover:bg-slate-50">
                             <td className="px-4 py-3 text-slate-600 align-top">
                                 {new Date(sale.timestamp).toLocaleDateString()} {new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </td>
                             <td className="px-4 py-3 align-top">
                                 <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs block w-fit mb-1">{sale.paymentMethod}</span>
                                 {(sale.paymentReference || sale.customerName) && (
                                     <span className="text-xs text-slate-400 block max-w-[120px] truncate">
                                         {sale.paymentReference || sale.customerName}
                                     </span>
                                 )}
                             </td>
                             <td className="px-4 py-3 align-top">
                                 <div className="font-bold text-slate-800">${sale.totalUSD.toFixed(2)}</div>
                                 <div className="text-xs text-slate-500">Bs {sale.totalBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</div>
                             </td>
                             <td className="px-4 py-3 text-slate-600 text-xs align-top">
                                 <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                                    {sale.items.map((item, idx) => (
                                        <div key={idx} className="whitespace-nowrap">
                                            <span className="font-bold text-slate-700">{item.quantity}</span> x {item.name}
                                        </div>
                                    ))}
                                 </div>
                             </td>
                             <td className="px-4 py-3 text-right align-top">
                                 <div className="flex justify-end gap-2">
                                     <button 
                                        onClick={() => handleOpenEdit(sale)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Editar Venta"
                                     >
                                         <Edit className="w-4 h-4" />
                                     </button>
                                     <button 
                                        onClick={() => handleDeleteSale(sale.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        title="Eliminar Venta"
                                     >
                                         <Trash2 className="w-4 h-4" />
                                     </button>
                                 </div>
                             </td>
                         </tr>
                     ))}
                     {filteredSales.length === 0 && (
                         <tr>
                             <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay ventas registradas en este periodo.</td>
                         </tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};

export default Reports;