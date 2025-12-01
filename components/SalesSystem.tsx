import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Sale, CartItem, Currency, PaymentMethod } from '../types';
import { Search, Plus, Trash2, Smartphone, CreditCard, User, Check, AlertCircle, ScanBarcode, X, RotateCcw } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

interface Props {
  inventory: Product[];
  rate: number;
  onProcessSale: (sale: Sale, updatedInventory: Product[]) => void;
  onUndoLastSale: () => void;
}

const SalesSystem: React.FC<Props> = ({ inventory, rate, onProcessSale, onUndoLastSale }) => {
  const [mode, setMode] = useState<'INVENTORY' | 'MANUAL'>('INVENTORY');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Input State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualCurrency, setManualCurrency] = useState<Currency>(Currency.USD);
  
  // Checkout State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PUNTO_VENTA);
  const [customerName, setCustomerName] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  
  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Suggestions Logic
  const suggestions = useMemo(() => {
    if (!searchTerm) return [];
    return inventory
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.barcode && p.barcode.includes(searchTerm))
      )
      .slice(0, 10);
  }, [inventory, searchTerm]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setShowSuggestions(false);
  };

  const handleAddToCart = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    if (mode === 'INVENTORY') {
        if (!selectedProduct) return;
        
        // Check stock
        const currentInCart = cart.reduce((acc, item) => item.productId === selectedProduct.id ? acc + item.quantity : acc, 0);
        if (selectedProduct.stock < (currentInCart + qty)) {
            alert(`Stock insuficiente. Disponible: ${selectedProduct.stock}`);
            return;
        }

        setCart(prev => {
            const existingIdx = prev.findIndex(i => i.productId === selectedProduct.id && !i.isManual);
            if (existingIdx > -1) {
                const newCart = [...prev];
                newCart[existingIdx].quantity += qty;
                return newCart;
            }
            return [...prev, {
                productId: selectedProduct.id,
                name: selectedProduct.name,
                price: selectedProduct.price,
                currency: selectedProduct.currency,
                quantity: qty,
                isManual: false
            }];
        });
        
        // Reset Inputs
        setSelectedProduct(null);
        setSearchTerm('');
        setQuantity('1');
        if (searchInputRef.current) searchInputRef.current.focus();

    } else {
        // Manual Mode
        if (!manualName || !manualPrice) return;
        setCart(prev => [...prev, {
            name: manualName,
            price: parseFloat(manualPrice),
            currency: manualCurrency,
            quantity: qty,
            isManual: true
        }]);
        setManualName('');
        setManualPrice('');
        setQuantity('1');
        // Do not reset manualCurrency to keep user preference sticky
    }
  };

  const handleClearCart = () => {
    if (confirm("¿Estás seguro de vaciar la venta actual?")) {
        setCart([]);
        setCustomerName('');
        setPaymentReference('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const { totalUSD, totalBsF } = useMemo(() => {
    let usd = 0;
    let bsf = 0;
    cart.forEach(item => {
        if (item.currency === Currency.USD) {
            usd += item.price * item.quantity;
            bsf += (item.price * item.quantity) * rate;
        } else {
            bsf += item.price * item.quantity;
            usd += (item.price * item.quantity) / rate;
        }
    });
    return { totalUSD: usd, totalBsF: bsf };
  }, [cart, rate]);

  const handleProcessSale = () => {
    if (cart.length === 0) return;
    
    // Validations
    if (paymentMethod === PaymentMethod.CREDITO && !customerName) {
        alert("El nombre del cliente es obligatorio para ventas a crédito");
        return;
    }
    if (paymentMethod === PaymentMethod.PAGO_MOVIL && !paymentReference) {
        alert("La referencia es obligatoria para Pago Móvil");
        return;
    }

    // Process
    const updatedInventory = [...inventory];
    cart.forEach(item => {
        if (!item.isManual && item.productId) {
            const idx = updatedInventory.findIndex(p => p.id === item.productId);
            if (idx > -1) {
                updatedInventory[idx].stock -= item.quantity;
            }
        }
    });

    const newSale: Sale = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        items: cart,
        totalUSD,
        totalBsF,
        rateAtSale: rate,
        paymentMethod,
        customerName: paymentMethod === PaymentMethod.CREDITO ? customerName : undefined,
        paymentReference: paymentMethod === PaymentMethod.PAGO_MOVIL ? paymentReference : undefined
    };

    onProcessSale(newSale, updatedInventory);
    setCart([]);
    setCustomerName('');
    setPaymentReference('');
    alert("Venta procesada con éxito!");
  };

  const handleScanSuccess = (code: string) => {
      const prod = inventory.find(p => p.barcode === code);
      if (prod) {
          // Immediately add 1 unit to cart
          setCart(prev => {
              const currentInCart = prev.reduce((acc, item) => item.productId === prod.id ? acc + item.quantity : acc, 0);
              
              if (prod.stock < (currentInCart + 1)) {
                  alert(`Stock insuficiente para ${prod.name}.`);
                  return prev;
              }

              const existingIdx = prev.findIndex(i => i.productId === prod.id && !i.isManual);
              if (existingIdx > -1) {
                  const newCart = [...prev];
                  newCart[existingIdx].quantity += 1;
                  return newCart;
              }
              return [...prev, {
                  productId: prod.id,
                  name: prod.name,
                  price: prod.price,
                  currency: prod.currency,
                  quantity: 1,
                  isManual: false
              }];
          });
          setShowScanner(false);
          // Optional: Add a subtle toast or sound here
      } else {
          alert("Producto no encontrado en inventario");
          setShowScanner(false);
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
       {showScanner && <BarcodeScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />}
       
       {/* Header Title Section */}
       <div className="p-4 border-b border-slate-200 flex justify-between items-center">
           <h2 className="text-xl font-bold text-slate-800">Sistema de Ventas</h2>
           <button 
              onClick={onUndoLastSale}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-transparent hover:border-red-100"
              title="Deshacer la última venta realizada"
           >
              <RotateCcw className="w-4 h-4" />
              Deshacer Última Venta
           </button>
       </div>

       {/* Mode Tabs */}
       <div className="px-6 pt-6 flex gap-4">
           <button 
             onClick={() => setMode('INVENTORY')}
             className={`px-6 py-2 rounded-lg font-medium transition-colors ${mode === 'INVENTORY' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
               Venta desde Inventario
           </button>
           <button 
             onClick={() => setMode('MANUAL')}
             className={`px-6 py-2 rounded-lg font-medium transition-colors ${mode === 'MANUAL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
               Venta Manual
           </button>
       </div>

       {/* Input Area - Replicating the row from the screenshot */}
       <div className="p-6 bg-slate-50 border-b border-slate-200">
           <div className="flex flex-col md:flex-row gap-4 items-end">
               
               {mode === 'INVENTORY' ? (
                   <>
                        <div className="flex-1 relative w-full">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Buscar Producto</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        ref={searchInputRef}
                                        type="text" 
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setShowSuggestions(true);
                                            setSelectedProduct(null);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        placeholder="Escribe el nombre o escanea..."
                                        className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && suggestions.length > 0) {
                                                handleSelectProduct(suggestions[0]);
                                                setShowSuggestions(false);
                                            }
                                        }}
                                    />
                                    {selectedProduct && <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 w-4 h-4" />}
                                </div>
                                <button 
                                    onClick={() => setShowScanner(true)} 
                                    className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 flex items-center gap-2 text-slate-700 font-medium"
                                    title="Escanear Código"
                                >
                                    <ScanBarcode className="w-5 h-5" />
                                    <span className="hidden sm:inline">Escanear</span>
                                </button>
                            </div>

                            {/* Autocomplete Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                    {suggestions.map(p => (
                                        <div 
                                            key={p.id}
                                            onClick={() => handleSelectProduct(p)}
                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                                        >
                                            <div className="font-medium text-slate-800">{p.name}</div>
                                            <div className="text-xs text-slate-500 flex justify-between">
                                                <span>Stock: {p.stock}</span>
                                                <span className="font-bold text-blue-600">${p.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-32">
                             <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad</label>
                             <input 
                                type="number" 
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                             />
                        </div>
                   </>
               ) : (
                   <>
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                            <input 
                                type="text"
                                value={manualName}
                                onChange={(e) => setManualName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nombre del producto..."
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Moneda</label>
                            <select
                                value={manualCurrency}
                                onChange={(e) => setManualCurrency(e.target.value as Currency)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={Currency.USD}>USD ($)</option>
                                <option value={Currency.BSF}>BsF</option>
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Precio ({manualCurrency === Currency.USD ? '$' : 'Bs'})
                            </label>
                            <input 
                                type="number"
                                value={manualPrice}
                                onChange={(e) => setManualPrice(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="w-24">
                             <label className="block text-sm font-semibold text-slate-700 mb-1">Cant.</label>
                             <input 
                                type="number" 
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                             />
                        </div>
                   </>
               )}

               <button 
                 onClick={handleAddToCart}
                 className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors h-[42px] flex items-center justify-center min-w-[140px]"
               >
                   Agregar a Venta
               </button>

               <button 
                 onClick={handleClearCart}
                 className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors h-[42px] min-w-[140px]"
               >
                   Limpiar Venta
               </button>
           </div>
           
           <div className="mt-2 text-xs text-slate-400">
               Tip: Escribe el nombre del producto para buscarlo rápidamente, o presiona Enter para seleccionar el primero.
           </div>
       </div>

       {/* Main Content Area: Split View */}
       <div className="flex-1 flex flex-col lg:flex-row">
           
           {/* Left Column: Product Table */}
           <div className="flex-1 border-r border-slate-200 overflow-y-auto bg-white p-4">
               <h3 className="font-bold text-slate-800 mb-4">Productos en Venta</h3>
               
               <table className="w-full text-left border-collapse">
                   <thead>
                       <tr className="bg-blue-50 border-b border-blue-100">
                           <th className="p-3 text-sm font-semibold text-blue-800">Producto</th>
                           <th className="p-3 text-sm font-semibold text-blue-800 text-center">Cant.</th>
                           <th className="p-3 text-sm font-semibold text-blue-800 text-right">Precio USD</th>
                           <th className="p-3 text-sm font-semibold text-blue-800 text-right">Precio BsF</th>
                           <th className="p-3 text-sm font-semibold text-blue-800 text-center">Acción</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {cart.map((item, idx) => {
                           const itemTotalUSD = item.currency === Currency.USD ? item.price * item.quantity : item.price * item.quantity / rate;
                           const itemTotalBsF = item.currency === Currency.BSF ? item.price * item.quantity : item.price * item.quantity * rate;
                           
                           return (
                               <tr key={idx} className="hover:bg-slate-50">
                                   <td className="p-3 font-medium text-slate-700">{item.name}</td>
                                   <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                                   <td className="p-3 text-right text-slate-600">${itemTotalUSD.toFixed(2)}</td>
                                   <td className="p-3 text-right text-slate-600">{itemTotalBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</td>
                                   <td className="p-3 text-center">
                                       <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                           <Trash2 className="w-4 h-4" />
                                       </button>
                                   </td>
                               </tr>
                           );
                       })}
                       {cart.length === 0 && (
                           <tr>
                               <td colSpan={5} className="p-8 text-center text-slate-400">
                                   No hay productos en la venta actual.
                               </td>
                           </tr>
                       )}
                   </tbody>
               </table>
           </div>

           {/* Right Column: Summary Panel */}
           <div className="w-full lg:w-96 bg-slate-50 p-6 flex flex-col gap-6">
               <div>
                   <h3 className="font-bold text-slate-800 mb-4">Resumen de Venta</h3>
                   
                   <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                       <div className="flex justify-between items-center">
                           <span className="text-slate-600">Total USD:</span>
                           <span className="text-xl font-bold text-slate-900">${totalUSD.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                           <span className="text-slate-600">Total BsF:</span>
                           <span className="text-xl font-bold text-slate-900">{totalBsF.toLocaleString('es-VE', { maximumFractionDigits: 2 })} BsF</span>
                       </div>
                   </div>
               </div>

               <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Método de Pago</label>
                   <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                   >
                       {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
               </div>

               {paymentMethod === PaymentMethod.PAGO_MOVIL && (
                   <div className="animate-fade-in">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Referencia</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                placeholder="Últimos 4 dígitos"
                                className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        </div>
                   </div>
               )}

                {paymentMethod === PaymentMethod.CREDITO && (
                   <div className="animate-fade-in">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Cliente</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Nombre del Cliente"
                                className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        </div>
                   </div>
               )}

               <button 
                 onClick={handleProcessSale}
                 disabled={cart.length === 0}
                 className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:bg-slate-300 disabled:shadow-none mt-auto"
               >
                   Procesar Venta
               </button>
           </div>
       </div>
    </div>
  );
};

export default SalesSystem;