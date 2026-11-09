import React, { useState } from 'react';
import { X, Radio, ShoppingBag, Plus, Minus, Search, Sparkles, AlertCircle } from 'lucide-react';
import { Product } from '../types/inventory';
import { money } from '../utils/storage';

interface LiveModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onChangeStock: (index: number, delta: number) => void;
  onRegisterSale: (product: Product, quantity: number, channel: string) => void;
}

export const LiveModeModal: React.FC<LiveModeModalProps> = ({
  isOpen,
  onClose,
  products,
  onChangeStock,
  onRegisterSale
}) => {
  const [search, setSearch] = useState('');
  const [sessionSold, setSessionSold] = useState(0);
  const [lastSoldName, setLastSoldName] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.rackLocation && p.rackLocation.toLowerCase().includes(search.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleQuickSell = (product: Product, masterIndex: number) => {
    if (product.stock <= 0) return;
    onChangeStock(masterIndex, -1);
    onRegisterSale(product, 1, 'TikTok Live');
    setSessionSold(prev => prev + 1);
    setLastSoldName(product.name);
    setTimeout(() => setLastSoldName(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-gray-950 text-white rounded-3xl w-full max-w-4xl shadow-2xl border border-pink-500/30 max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-pink-900 via-rose-900 to-gray-900 border-b border-pink-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600/30 border border-red-500/50 flex items-center justify-center">
              <Radio className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white tracking-widest animate-pulse">
                  EN DIRECTO
                </span>
                <h3 className="font-extrabold text-base sm:text-xl text-white">
                  Modo TikTok Live
                </h3>
              </div>
              <p className="text-xs text-pink-300">
                Control de inventario rápido para directos • Pulsa para descontar stock al instante
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live sales counter */}
            <div className="bg-black/40 px-3.5 py-1.5 rounded-xl border border-pink-500/30 text-right">
              <span className="text-[10px] uppercase tracking-wider text-pink-300 block font-bold">
                Vendido en este Directo
              </span>
              <span className="text-xl font-black text-emerald-400">
                {sessionSold} <span className="text-xs font-normal text-gray-400">prendas</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Live Search and Flash Notification */}
        <div className="p-4 bg-gray-900/90 border-b border-gray-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Buscar prenda o perchero (ej. Perchero 1, Vestido...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-400 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </div>

          {lastSoldName && (
            <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>¡Vendido 1x: {lastSoldName}!</span>
            </div>
          )}
        </div>

        {/* Live Grid with BIG touch targets */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((item) => {
            const masterIndex = products.findIndex(p => p.id === item.id);
            const isOutOfStock = item.stock <= 0;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isOutOfStock
                    ? 'bg-gray-900/40 border-gray-800 opacity-60'
                    : item.stock <= 2
                    ? 'bg-gradient-to-b from-gray-900 to-amber-950/20 border-amber-500/40'
                    : 'bg-gradient-to-b from-gray-900 to-pink-950/20 border-pink-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {item.rackLocation && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 mb-1">
                        📍 {item.rackLocation}
                      </span>
                    )}
                    <h4 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {item.size || 'Talla Curvy Plus'} • <strong className="text-pink-300 text-sm">{money(item.price)}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Stock</span>
                    <span className={`text-2xl font-black ${
                      isOutOfStock ? 'text-red-500' : item.stock <= 2 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {item.stock}
                    </span>
                  </div>
                </div>

                {/* Big Action button for live streaming */}
                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center gap-2">
                  <button
                    onClick={() => handleQuickSell(item, masterIndex)}
                    disabled={isOutOfStock}
                    className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isOutOfStock
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 active:scale-95 text-white shadow-lg shadow-pink-600/30'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isOutOfStock ? 'AGOTADO' : '¡VENDIDO 1x!'}</span>
                  </button>

                  <button
                    onClick={() => onChangeStock(masterIndex, 1)}
                    title="Añadir 1 (ej. cancelación de clienta)"
                    className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold active:scale-95 transition-all cursor-pointer border border-gray-700"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
