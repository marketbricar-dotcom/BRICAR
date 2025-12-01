import React, { useState } from 'react';
import { Product, ProductCategory, Currency } from '../types';
import { Plus, Search, Package, Trash2, ScanBarcode, Edit, PlusCircle, Save, Download } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  inventory: Product[];
  setInventory: React.Dispatch<React.SetStateAction<Product[]>>;
  rate: number;
}

const initialProductState: Partial<Product> = {
    category: ProductCategory.OTROS,
    currency: Currency.USD,
    unit: 'Unidad',
    stock: 0,
    unitsPerCase: 1,
    barcode: '',
    cost: 0,
    profitMargin: 0,
    name: '',
    price: 0
};

const Inventory: React.FC<Props> = ({ inventory, setInventory, rate }) => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [filterCat, setFilterCat] = useState<ProductCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>(initialProductState);

  const handleSaveProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      alert("Nombre y Precio son obligatorios");
      return;
    }

    if (newProduct.id) {
        // UPDATE EXISTING
        setInventory(prev => prev.map(p => p.id === newProduct.id ? { ...newProduct } as Product : p));
        alert("Producto actualizado correctamente");
    } else {
        // CREATE NEW
        const product: Product = {
            id: crypto.randomUUID(),
            name: newProduct.name,
            category: newProduct.category as ProductCategory,
            price: Number(newProduct.price),
            currency: newProduct.currency as Currency,
            unit: newProduct.unit || 'Unidad',
            unitsPerCase: Number(newProduct.unitsPerCase) || 1,
            stock: Number(newProduct.stock) || 0,
            barcode: newProduct.barcode || '',
            cost: Number(newProduct.cost) || 0,
            profitMargin: Number(newProduct.profitMargin) || 0
        };
        setInventory(prev => [...prev, product]);
        alert("Producto agregado correctamente");
    }

    setNewProduct(initialProductState);
    setView('LIST');
  };

  const handleEdit = (product: Product) => {
      setNewProduct({ ...product });
      setView('FORM');
  };

  const handleQuickAddStock = (product: Product) => {
      const quantityStr = prompt(`INGRESO RÁPIDO DE INVENTARIO\n\nProducto: ${product.name}\nStock Actual: ${product.stock}\n\nIngrese cantidad a AGREGAR (Use números negativos para restar):`);
      if (quantityStr) {
          // Handle comma as decimal separator for better UX
          const cleanStr = quantityStr.replace(',', '.');
          const qty = parseFloat(cleanStr);
          
          if (!isNaN(qty) && qty !== 0) {
              setInventory(prev => prev.map(p => {
                  if (p.id === product.id) {
                      const newStock = parseFloat((p.stock + qty).toFixed(2));
                      return { ...p, stock: newStock };
                  }
                  return p;
              }));
          }
      }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
      setInventory(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Sort alphabetically by name
    const sortedData = [...inventory].sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    // Title
    doc.setFontSize(18);
    doc.text(`Reporte de Inventario - Mini Market Bricar`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Total Productos: ${inventory.length}`, 14, 34);

    // Table
    const tableData = sortedData.map(p => [
        p.name,
        p.category,
        p.currency === Currency.USD ? `$${p.price.toFixed(2)}` : `${p.price.toFixed(2)} BsF`,
        p.stock.toString(),
    ]);

    autoTable(doc, {
        startY: 40,
        head: [['Producto', 'Categoría', 'Precio', 'Cantidad']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }, // Blue-600
        styles: { fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Product Name
            1: { cellWidth: 40 },     // Category
            2: { cellWidth: 30, halign: 'right' }, // Price
            3: { cellWidth: 25, halign: 'center' } // Stock
        }
    });

    doc.save(`inventario_${new Date().getTime()}.pdf`);
  };

  // Filter AND Sort alphabetically (Case Insensitive)
  const filteredInventory = inventory.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(searchTerm));
    const matchesCat = filterCat === 'ALL' || p.category === filterCat;
    return matchesSearch && matchesCat;
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const handleScanSuccess = (decodedText: string) => {
    if (view === 'LIST') {
        // If in list view, search for the product
        setSearchTerm(decodedText);
    } else {
        // If in form view, fill the barcode input
        setNewProduct(prev => ({ ...prev, barcode: decodedText }));
    }
    setShowScanner(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px] relative">
      {showScanner && (
        <BarcodeScanner 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">
              {view === 'LIST' ? 'Inventario' : (newProduct.id ? 'Editar Producto' : 'Agregar Producto')}
          </h2>
        </div>
        <div className="flex gap-2">
            {view === 'LIST' && (
                <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-slate-800 text-white hover:bg-slate-900"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF Inventario</span>
                </button>
            )}
            <button
            onClick={() => {
                if (view === 'LIST') {
                    setNewProduct(initialProductState);
                    setView('FORM');
                } else {
                    setView('LIST');
                }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'LIST' 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
            >
            {view === 'LIST' ? <><Plus className="w-4 h-4" /> Agregar Producto</> : 'Volver a la Lista'}
            </button>
        </div>
      </div>

      {view === 'LIST' ? (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o código..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button 
                onClick={() => setShowScanner(true)}
                className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2"
                title="Escanear Código para Buscar"
              >
                  <ScanBarcode className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm font-medium">Escanear</span>
              </button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
               <button
                  onClick={() => setFilterCat('ALL')}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterCat === 'ALL' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Todos
                </button>
              {Object.values(ProductCategory).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterCat === cat ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Producto</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Precio</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Existencias</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map(product => {
                    const priceInOther = product.currency === Currency.USD 
                        ? product.price * rate 
                        : product.price / rate;
                    
                    return (
                        <tr key={product.id} className="hover:bg-slate-50/50 group">
                        <td className="p-4">
                            <div className="font-medium text-slate-900">{product.name}</div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{product.unit} ({product.unitsPerCase} u/caja)</span>
                                {product.barcode && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                        {product.barcode}
                                    </span>
                                )}
                            </div>
                        </td>
                        <td className="p-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                                {product.category}
                            </span>
                        </td>
                        <td className="p-4">
                            <div className="font-bold text-slate-700">
                                {product.currency === Currency.USD ? '$' : 'BsF'}{product.price}
                            </div>
                            <div className="text-xs text-slate-400">
                                ≈ {product.currency === Currency.USD ? 'BsF' : '$'}{priceInOther.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                            </div>
                        </td>
                        <td className="p-4">
                            <span className={`font-bold ${product.stock < 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                {product.stock}
                            </span>
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                                <button 
                                    onClick={() => handleQuickAddStock(product)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md transition-colors text-xs font-semibold border border-green-200"
                                    title="Añadir Stock"
                                >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    Stock
                                </button>
                                <button 
                                    onClick={() => handleEdit(product)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar Producto"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(product.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                        </tr>
                    )
                })}
              </tbody>
            </table>
            {filteredInventory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Package className="w-8 h-8 mb-2 opacity-50" />
                    <p>No se encontraron productos.</p>
                </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-4">
            
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Código de Barras</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={newProduct.barcode || ''}
                            onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                            placeholder="Escanea o escribe el código"
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                        />
                         <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                </div>
                <button 
                    onClick={() => setShowScanner(true)}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                    title="Escanear con Cámara"
                >
                    <ScanBarcode className="w-5 h-5" />
                    <span className="text-sm">Escanear</span>
                </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Producto</label>
              <input
                type="text"
                value={newProduct.name || ''}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                    <select
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({...newProduct, category: e.target.value as ProductCategory})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Unidad de Medida</label>
                     <input
                        type="text"
                        placeholder="ej. Caja, Unidad"
                        value={newProduct.unit}
                        onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Moneda Base</label>
                     <select
                        value={newProduct.currency}
                        onChange={(e) => setNewProduct({...newProduct, currency: e.target.value as Currency})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value={Currency.USD}>USD (Dólar)</option>
                        <option value={Currency.BSF}>BsF (Bolívar)</option>
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Costo (Opcional)</label>
                     <input
                        type="number"
                        value={newProduct.cost === 0 ? '' : newProduct.cost}
                        onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            const margin = newProduct.profitMargin || 0;
                            // Update price if profit margin is set
                            const newPrice = margin > 0 ? Number((val * (1 + margin / 100)).toFixed(2)) : newProduct.price;
                            setNewProduct({...newProduct, cost: val, price: newPrice});
                        }}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">% Ganancia (Opcional)</label>
                     <input
                        type="number"
                        value={newProduct.profitMargin === 0 ? '' : newProduct.profitMargin}
                        onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            const cost = newProduct.cost || 0;
                            // Update price based on cost and new margin
                            const newPrice = cost > 0 ? Number((cost * (1 + val / 100)).toFixed(2)) : newProduct.price;
                            setNewProduct({...newProduct, profitMargin: val, price: newPrice});
                        }}
                        placeholder="0%"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Precio de Venta</label>
                     <input
                        type="number"
                        value={newProduct.price === 0 ? '' : newProduct.price}
                        onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-blue-50/50"
                    />
                </div>
            </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Unidades por Caja/Paquete</label>
                     <input
                        type="number"
                        value={newProduct.unitsPerCase}
                        onChange={(e) => setNewProduct({...newProduct, unitsPerCase: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">
                         {newProduct.id ? 'Existencia / Stock Actual' : 'Existencia Inicial'}
                     </label>
                     <input
                        type="number"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({...newProduct, stock: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <button
                onClick={handleSaveProduct}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors mt-4 flex items-center justify-center gap-2"
            >
                <Save className="w-5 h-5" />
                {newProduct.id ? 'Actualizar Producto' : 'Guardar Producto'}
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;