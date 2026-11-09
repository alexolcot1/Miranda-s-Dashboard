/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  AppData, 
  Product, 
  Sale, 
  Purchase, 
  Expense, 
  FiscalTask, 
  Note, 
  CartItem, 
  PurchaseLine, 
  PageId 
} from './types/inventory';
import { 
  loadData, 
  saveData, 
  money, 
  cents, 
  uid, 
  isoToday, 
  localDateTime, 
  productLabel, 
  exportBackup, 
  exportCSV 
} from './utils/storage';
import { 
  generateInventoryPDF, 
  generateSalesPDF, 
  generatePurchasesPDF, 
  generateExpensesPDF, 
  generateTasksAndNotesPDF 
} from './utils/pdfExport';
import { LiveModeModal } from './components/LiveModeModal';
import { RestoreBackupModal } from './components/RestoreBackupModal';
import { 
  Radio, 
  Plus, 
  Trash2, 
  Edit3, 
  Share2, 
  Check, 
  ExternalLink, 
  Download, 
  Upload, 
  Sparkles,
  Search,
  ShoppingCart,
  Calendar,
  Layers,
  Tag,
  AlertTriangle,
  Cloud,
  CheckCircle,
  LogIn,
  LogOut as LogOutIcon,
  FileText,
  Calculator
} from 'lucide-react';
import { 
  auth, 
  signInWithGoogle, 
  logOut, 
  subscribeToStoreData, 
  pushStoreDataToCloud 
} from './utils/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';

const RENTACHECK_ITEMS = [
  ['Ingresos', 'Ventas y otros ingresos de la actividad del ejercicio.'],
  ['Compras y existencias', 'Facturas de mercancía, recargo de equivalencia y recuento de existencias al cierre.'],
  ['Gastos', 'Facturas/recibos y justificantes; comprobar cuáles cumplen los requisitos para ser deducibles.'],
  ['Libros y registros', 'Libros registro exigibles según estimación directa u objetiva y obligaciones aplicables.'],
  ['Pagos a cuenta', 'Revisar pagos fraccionados realizados, retenciones u otros datos fiscales que correspondan.'],
  ['Datos personales', 'Datos fiscales y demás información que solicite el borrador oficial.'],
  ['Revisión oficial', 'Contrastar el borrador y la información en Renta WEB de la Agencia Tributaria.']
];

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [currentPage, setCurrentPage] = useState<PageId>('resumen');
  
  // Modals & Extras
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Search & Filters
  const [productSearch, setProductSearch] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [taxFilter, setTaxFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [noteFilter, setNoteFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Product Form State (Add / Edit)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodSku, setProdSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Ropa');
  const [prodSize, setProdSize] = useState('');
  const [prodColor, setProdColor] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodChannel, setProdChannel] = useState('TikTok & WhatsApp');
  const [prodRack, setProdRack] = useState('');

  // Calculadora de IVA State
  const [calcVatRate, setCalcVatRate] = useState<string>('21');
  const [calcPriceNoVat, setCalcPriceNoVat] = useState<string>('');
  const [calcPriceWithVat, setCalcPriceWithVat] = useState<string>('');
  const [calcVatAmount, setCalcVatAmount] = useState<string>('');
  const [calcLastEdited, setCalcLastEdited] = useState<'noVat' | 'withVat' | 'vatAmount' | null>('noVat');

  // Cart & Sales State
  const [saleCart, setSaleCart] = useState<CartItem[]>([]);
  const [selectedCartProductId, setSelectedCartProductId] = useState('');
  const [cartQuantity, setCartQuantity] = useState(1);
  const [salePayment, setSalePayment] = useState('Bizum');
  const [saleDate, setSaleDate] = useState(localDateTime());
  const [saleComment, setSaleComment] = useState('');

  // Purchase Form State
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseInvoice, setPurchaseInvoice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(isoToday());
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [purchaseSelectedProd, setPurchaseSelectedProd] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('');
  const [purchaseBase, setPurchaseBase] = useState('0');
  const [purchaseVat, setPurchaseVat] = useState('0');
  const [purchaseSurcharge, setPurchaseSurcharge] = useState('0');
  const [purchaseOther, setPurchaseOther] = useState('0');

  // Expense Form State
  const [expenseDate, setExpenseDate] = useState(isoToday());
  const [expenseCategory, setExpenseCategory] = useState('Envíos y embalaje');
  const [expenseSupplier, setExpenseSupplier] = useState('');
  const [expenseInvoice, setExpenseInvoice] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseVat, setExpenseVat] = useState('0');

  // Fiscal Task Form State
  const [taxText, setTaxText] = useState('');
  const [taxDate, setTaxDate] = useState('');
  const [taxModel, setTaxModel] = useState('General');

  // Note Form State
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [noteCategory, setNoteCategory] = useState('General');

  // Cloud & Firebase Real-time Sync
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'cloud' | 'error'>('local');
  const [isInitialCloudLoad, setIsInitialCloudLoad] = useState(true);
  const isRemoteUpdateRef = useRef(false);

  // Firebase Auth Listener & Realtime Firestore sync (Shared store across collaborators)
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous snapshot listener on user change or logout
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      setCurrentUser(user);
      if (user) {
        setSyncStatus('syncing');
        unsubscribeSnapshot = subscribeToStoreData(
          user.uid,
          (remoteData) => {
            isRemoteUpdateRef.current = true;
            setData(remoteData);
            setSyncStatus('cloud');
            setIsInitialCloudLoad(false);
          },
          (err) => {
            console.error('Snapshot error:', err);
            setSyncStatus('error');
          },
          async () => {
            // First time shared store initialization
            try {
              await pushStoreDataToCloud(user.uid, data);
              setSyncStatus('cloud');
              setIsInitialCloudLoad(false);
            } catch (initErr) {
              console.error('Initial shared push error:', initErr);
            }
          }
        );
      } else {
        setSyncStatus('local');
        setIsInitialCloudLoad(false);
      }
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribeAuth();
    };
  }, []);

  // Sync to local storage & Cloud on state changes
  useEffect(() => {
    saveData(data);
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    if (currentUser && !isInitialCloudLoad) {
      setSyncStatus('syncing');
      pushStoreDataToCloud(currentUser.uid, data)
        .then(() => setSyncStatus('cloud'))
        .catch((err) => {
          console.error('Cloud push error:', err);
          setSyncStatus('error');
        });
    }
  }, [data, currentUser, isInitialCloudLoad]);

  const handleGoogleLogin = async () => {
    try {
      setSyncStatus('syncing');
      const user = await signInWithGoogle();
      if (!user) {
        setSyncStatus('local');
        return;
      }
      showToast(`¡Bienvenida/o ${user.displayName || user.email}! Tienda compartida conectada en tiempo real.`);
      // Initial upload
      await pushStoreDataToCloud(user.uid, data);
      setSyncStatus('cloud');
    } catch (err: any) {
      setSyncStatus('local');
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        showToast('No se pudo iniciar sesión con Google.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      showToast('Sesión cerrada. La app continúa en modo local.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Calculations
  const allUnits = data.products.reduce((s, p) => s + Number(p.stock || 0), 0);
  const totalSales = cents(data.sales.reduce((s, v) => s + Number(v.total || 0), 0));
  const totalPurchases = cents(data.purchases.reduce((s, v) => s + Number(v.total || 0), 0));
  const totalExpenses = cents(data.expenses.reduce((s, v) => s + Number(v.amount || 0), 0));
  const soldCost = cents(data.sales.reduce((sum, s) => sum + (s.items || []).reduce((a, l) => a + Number(l.costTotal ?? (Number(l.unitCost || 0) * Number(l.quantity || 0))), 0), 0));
  const marginEstimate = cents(totalSales - soldCost - totalExpenses);
  const lowStockProducts = data.products.filter(p => p.stock <= 3);
  const stockTotalValue = data.products.reduce((s, p) => s + (p.stock * p.price), 0);
  const todaySalesTotal = data.sales.filter(s => (s.date || '').slice(0, 10) === isoToday()).reduce((a, s) => a + s.total, 0);

  // Cart calculations
  const cartTotal = cents(saleCart.reduce((s, l) => s + l.price * l.quantity, 0));
  const purchaseCalculatedTotal = cents(
    ['base', 'vat', 'surcharge', 'other'].reduce((sum, key) => {
      if (key === 'base') return sum + Math.max(0, Number(purchaseBase) || 0);
      if (key === 'vat') return sum + Math.max(0, Number(purchaseVat) || 0);
      if (key === 'surcharge') return sum + Math.max(0, Number(purchaseSurcharge) || 0);
      return sum + Math.max(0, Number(purchaseOther) || 0);
    }, 0)
  );

  // Product Actions
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = prodName.trim();
    const parsedPrice = parseFloat(String(prodPrice).replace(',', '.'));
    const price = isNaN(parsedPrice) ? 0 : parsedPrice;
    const parsedCost = parseFloat(String(prodCost).replace(',', '.'));
    const cost = isNaN(parsedCost) ? 0 : parsedCost;
    const stock = Number(prodStock);

    if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(cost) || cost < 0 || !Number.isInteger(stock) || stock < 0) {
      showToast('Revisa nombre, precio, coste y stock.');
      return;
    }

    if (editingProductId) {
      // Edit
      setData(prev => ({
        ...prev,
        products: prev.products.map(p => {
          if (p.id === editingProductId) {
            const updatedSku = prodSku.trim() || p.sku || p.id.slice(-6).toUpperCase();
            return {
              ...p,
              sku: updatedSku,
              code: updatedSku,
              name,
              category: prodCategory,
              size: prodSize.trim(),
              color: prodColor.trim(),
              price: cents(price),
              unitCost: cents(cost),
              stock,
              channel: prodChannel,
              rackLocation: prodRack.trim()
            };
          }
          return p;
        })
      }));
      setEditingProductId(null);
      showToast('Variante actualizada');
    } else {
      // Add
      const newSku = prodSku.trim() || 'MCP-' + Math.floor(1000 + Math.random() * 9000);
      const newP: Product = {
        id: uid('p'),
        sku: newSku,
        code: newSku,
        name,
        category: prodCategory,
        size: prodSize.trim(),
        color: prodColor.trim(),
        price: cents(price),
        unitCost: cents(cost),
        stock,
        channel: prodChannel,
        rackLocation: prodRack.trim()
      };
      setData(prev => ({
        ...prev,
        products: [...prev.products, newP]
      }));
      showToast('Variante añadida');
    }

    // Reset Form
    setProdSku('');
    setProdName('');
    setProdSize('');
    setProdColor('');
    setProdPrice('');
    setProdCost('');
    setProdStock('10');
    setProdRack('');
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProdSku(p.sku || p.code || p.id.slice(-6).toUpperCase());
    setProdName(p.name);
    setProdCategory(p.category || 'Ropa');
    setProdSize(p.size || '');
    setProdColor(p.color || '');
    setProdPrice(p.price ? String(p.price) : '');
    setProdCost(p.unitCost ? String(p.unitCost) : '');
    setProdStock(String(p.stock));
    setProdChannel(p.channel || 'TikTok & WhatsApp');
    setProdRack(p.rackLocation || '');
    setCurrentPage('inventario');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setProdSku('');
    setProdName('');
    setProdSize('');
    setProdColor('');
    setProdPrice('');
    setProdCost('');
    setProdStock('10');
    setProdRack('');
  };

  // Calculadora de IVA Handlers
  const handleCalculateVat = (fromField?: 'noVat' | 'withVat' | 'vatAmount') => {
    const rate = Number(calcVatRate) || 21;
    const factor = rate / 100;
    const trigger = fromField || calcLastEdited || 'noVat';

    if (trigger === 'noVat') {
      const base = parseFloat(String(calcPriceNoVat).replace(',', '.'));
      if (!isNaN(base) && base >= 0) {
        const vat = base * factor;
        const total = base + vat;
        setCalcVatAmount(vat.toFixed(2));
        setCalcPriceWithVat(total.toFixed(2));
      }
    } else if (trigger === 'withVat') {
      const total = parseFloat(String(calcPriceWithVat).replace(',', '.'));
      if (!isNaN(total) && total >= 0) {
        const base = total / (1 + factor);
        const vat = total - base;
        setCalcPriceNoVat(base.toFixed(2));
        setCalcVatAmount(vat.toFixed(2));
      }
    } else if (trigger === 'vatAmount') {
      const vat = parseFloat(String(calcVatAmount).replace(',', '.'));
      if (!isNaN(vat) && vat >= 0 && factor > 0) {
        const base = vat / factor;
        const total = base + vat;
        setCalcPriceNoVat(base.toFixed(2));
        setCalcPriceWithVat(total.toFixed(2));
      }
    }
  };

  const handleClearCalc = () => {
    setCalcPriceNoVat('');
    setCalcPriceWithVat('');
    setCalcVatAmount('');
  };

  const handleDeleteProduct = (id: string) => {
    const p = data.products.find(x => x.id === id);
    if (!p) return;
    const hasHistory = data.sales.some(s => (s.items || []).some(l => l.productId === id)) ||
                       data.purchases.some(s => (s.lines || []).some(l => l.productId === id));

    const message = hasHistory
      ? `Hay ventas o compras históricas de "${productLabel(p)}". ¿Seguro que deseas eliminarla del inventario? El histórico se conservará como texto, pero esta variante ya no podrá seleccionarse.`
      : `¿Estás segura de que deseas eliminar "${productLabel(p)}" de tu inventario?`;

    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar variante del inventario?',
      message,
      confirmLabel: 'Sí, Eliminar variante',
      isDanger: true,
      onConfirm: () => {
        setData(prev => ({
          ...prev,
          products: prev.products.filter(x => x.id !== id)
        }));
        showToast('Variante eliminada del inventario');
      }
    });
  };

  const handleChangeStockDirect = (productId: string, delta: number) => {
    setData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === productId) {
          return { ...p, stock: Math.max(0, p.stock + delta) };
        }
        return p;
      })
    }));
  };

  const handleCopyWhatsApp = (p: Product) => {
    const text = `¡Hola corazón! 💖 Te confirmo disponibilidad en *MIRANDA’S Closets+*:
👗 *${p.name}*
✨ Talla: ${p.size || 'Curvy Plus'} ${p.color ? `· Color: ${p.color}` : ''}
🏷️ Precio: ${money(p.price)}
📦 Envíos rápidos desde Sevilla (24/48h)
📲 ¿Te lo reservo para tu pedido?`;

    navigator.clipboard.writeText(text);
    setCopiedId(p.id);
    showToast('¡Mensaje para WhatsApp copiado al portapapeles!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Cart & Sales Actions
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    const p = data.products.find(x => x.id === selectedCartProductId);
    if (!p || cartQuantity < 1) {
      showToast('Elige una variante y una cantidad válida.');
      return;
    }
    const existing = saleCart.find(l => l.productId === p.id);
    const already = existing ? existing.quantity : 0;
    if (cartQuantity + already > p.stock) {
      showToast('No hay suficientes unidades disponibles para esa cantidad.');
      return;
    }

    if (existing) {
      setSaleCart(prev => prev.map(l => l.productId === p.id ? { ...l, quantity: l.quantity + cartQuantity } : l));
    } else {
      setSaleCart(prev => [
        ...prev,
        {
          productId: p.id,
          name: productLabel(p),
          category: p.category,
          size: p.size,
          color: p.color,
          quantity: cartQuantity,
          price: p.price,
          unitCost: Number(p.unitCost || 0)
        }
      ]);
    }
    setCartQuantity(1);
    showToast('Artículo añadido al carrito');
  };

  const handleRemoveCartLine = (id: string) => {
    setSaleCart(prev => prev.filter(l => l.productId !== id));
  };

  const handleClearCart = () => {
    setSaleCart([]);
    showToast('Carrito vacío');
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleCart.length) {
      showToast('Añade productos al carrito.');
      return;
    }

    // Verify stock
    for (const l of saleCart) {
      const p = data.products.find(x => x.id === l.productId);
      if (!p || p.stock < l.quantity) {
        showToast('El stock ha cambiado. Revisa el carrito.');
        return;
      }
    }

    const items = saleCart.map(l => ({
      ...l,
      total: cents(l.quantity * l.price),
      costTotal: cents(l.quantity * l.unitCost)
    }));

    const newSale: Sale = {
      id: uid('s'),
      date: saleDate,
      payment: salePayment,
      comment: saleComment.trim(),
      items,
      total: cents(items.reduce((a, l) => a + l.total, 0))
    };

    // Deduct stock
    setData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        const itemInCart = saleCart.find(l => l.productId === p.id);
        if (itemInCart) {
          return { ...p, stock: Math.max(0, p.stock - itemInCart.quantity) };
        }
        return p;
      }),
      sales: [newSale, ...prev.sales]
    }));

    setSaleCart([]);
    setSaleComment('');
    setSaleDate(localDateTime());
    showToast('Venta registrada y stock actualizado');
  };

  const handleCancelSale = (id: string) => {
    const s = data.sales.find(x => x.id === id);
    if (!s) return;

    setConfirmDialog({
      isOpen: true,
      title: '¿Anular esta venta?',
      message: 'Las unidades de los artículos se devolverán al inventario y el importe dejará de contar en las ventas totales.',
      confirmLabel: 'Sí, Anular venta',
      isDanger: true,
      onConfirm: () => {
        setData(prev => ({
          ...prev,
          products: prev.products.map(p => {
            const soldItem = (s.items || []).find(l => l.productId === p.id);
            if (soldItem) {
              return { ...p, stock: p.stock + soldItem.quantity };
            }
            return p;
          }),
          sales: prev.sales.filter(x => x.id !== id)
        }));
        showToast('Venta anulada; stock y totales actualizados');
      }
    });
  };

  // Purchases Actions
  const handleAddPurchaseLine = () => {
    const p = data.products.find(x => x.id === purchaseSelectedProd);
    const qty = Number(purchaseQty);
    const cost = Number(purchaseUnitCost);

    if (!p || !Number.isInteger(qty) || qty < 1 || !Number.isFinite(cost) || cost < 0) {
      showToast('Elige una variante y cantidades/costes válidos.');
      return;
    }

    const existing = purchaseLines.find(l => l.productId === p.id);
    if (existing) {
      const newQ = existing.quantity + qty;
      const newUnitCost = cents((existing.unitCost * existing.quantity + cost * qty) / newQ);
      setPurchaseLines(prev => prev.map(l => l.productId === p.id ? { ...l, quantity: newQ, unitCost: newUnitCost } : l));
    } else {
      setPurchaseLines(prev => [
        ...prev,
        {
          productId: p.id,
          name: productLabel(p),
          quantity: qty,
          unitCost: cents(cost)
        }
      ]);
    }
    showToast('Línea añadida a la factura');
  };

  const handleRemovePurchaseLine = (id: string) => {
    setPurchaseLines(prev => prev.filter(l => l.productId !== id));
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = purchaseSupplier.trim();
    const invoice = purchaseInvoice.trim();
    const date = purchaseDate;

    if (!supplier || !invoice || !date) {
      showToast('Completa proveedor, factura y fecha.');
      return;
    }

    const record: Purchase = {
      id: uid('buy'),
      supplier,
      invoice,
      date,
      notes: purchaseNotes.trim(),
      base: cents(purchaseBase),
      iva: cents(purchaseVat),
      recargo: cents(purchaseSurcharge),
      other: cents(purchaseOther),
      total: purchaseCalculatedTotal,
      lines: purchaseLines.map(l => ({ ...l })),
      createdAt: new Date().toISOString()
    };

    // Update product stock and unitCost
    setData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        const line = purchaseLines.find(l => l.productId === p.id);
        if (line) {
          return {
            ...p,
            stock: p.stock + line.quantity,
            unitCost: line.unitCost
          };
        }
        return p;
      }),
      purchases: [record, ...prev.purchases]
    }));

    // Reset Form
    setPurchaseSupplier('');
    setPurchaseInvoice('');
    setPurchaseDate(isoToday());
    setPurchaseNotes('');
    setPurchaseBase('0');
    setPurchaseVat('0');
    setPurchaseSurcharge('0');
    setPurchaseOther('0');
    setPurchaseLines([]);
    showToast('Factura guardada y stock actualizado');
  };

  const handleDeletePurchase = (id: string) => {
    const p = data.purchases.find(x => x.id === id);
    if (!p) return;

    // Check if sufficient stock remains to revert
    for (const l of (p.lines || [])) {
      const prod = data.products.find(x => x.id === l.productId);
      if (prod && prod.stock < l.quantity) {
        showToast('No se puede revertir: faltan unidades en stock para restar esta compra.');
        return;
      }
    }

    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar factura de compra?',
      message: `Se eliminará la factura "${p.invoice}" de ${p.supplier} y se revertirá el aumento de stock de sus líneas.`,
      confirmLabel: 'Sí, Eliminar factura',
      isDanger: true,
      onConfirm: () => {
        setData(prev => ({
          ...prev,
          products: prev.products.map(prod => {
            const line = (p.lines || []).find(l => l.productId === prod.id);
            if (line) {
              return { ...prod, stock: prod.stock - line.quantity };
            }
            return prod;
          }),
          purchases: prev.purchases.filter(x => x.id !== id)
        }));
        showToast('Factura eliminada y stock ajustado');
      }
    });
  };

  // Expense Actions
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(expenseAmount);
    const iva = Number(expenseVat);

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(iva) || iva < 0 || iva > amount) {
      showToast('Revisa el importe total y el IVA anotado.');
      return;
    }
    if (!expenseDate || !expenseDescription.trim()) {
      showToast('Completa fecha y descripción.');
      return;
    }

    const ex: Expense = {
      id: uid('exp'),
      date: expenseDate,
      category: expenseCategory,
      supplier: expenseSupplier.trim(),
      invoice: expenseInvoice.trim(),
      description: expenseDescription.trim(),
      amount: cents(amount),
      iva: cents(iva),
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      expenses: [ex, ...prev.expenses]
    }));

    setExpenseDescription('');
    setExpenseSupplier('');
    setExpenseInvoice('');
    setExpenseAmount('');
    setExpenseVat('0');
    showToast('Gasto guardado');
  };

  const handleDeleteExpense = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar gasto registrado?',
      message: '¿Estás segura de que deseas eliminar este gasto del registro financiero?',
      confirmLabel: 'Eliminar gasto',
      isDanger: true,
      onConfirm: () => {
        setData(prev => ({
          ...prev,
          expenses: prev.expenses.filter(x => x.id !== id)
        }));
        showToast('Gasto eliminado');
      }
    });
  };

  // Fiscal Tasks & Renta Checklist
  const handleTaxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxText.trim() || !taxDate) {
      showToast('Escribe la tarea y su fecha para recordártelo.');
      return;
    }

    const newTask: FiscalTask = {
      id: uid('f'),
      text: taxText.trim(),
      dueDate: taxDate,
      model: taxModel,
      completed: false,
      system: false
    };

    setData(prev => ({
      ...prev,
      fiscalTasks: [...prev.fiscalTasks, newTask]
    }));

    setTaxText('');
    setTaxDate('');
    showToast('Tarea fiscal añadida');
  };

  const handleToggleFiscal = (id: string) => {
    setData(prev => ({
      ...prev,
      fiscalTasks: prev.fiscalTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const handleDeleteFiscal = (id: string) => {
    setData(prev => ({
      ...prev,
      fiscalTasks: prev.fiscalTasks.filter(t => t.id !== id)
    }));
    showToast('Tarea eliminada');
  };

  const handleToggleRentaCheck = (index: number) => {
    setData(prev => {
      const exists = prev.rentaChecks.includes(index);
      return {
        ...prev,
        rentaChecks: exists ? prev.rentaChecks.filter(x => x !== index) : [...prev.rentaChecks, index]
      };
    });
  };

  // Notes Actions
  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const n: Note = {
      id: uid('n'),
      text: noteText.trim(),
      dueDate: noteDate,
      category: noteCategory,
      completed: false,
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      notes: [n, ...prev.notes]
    }));

    setNoteText('');
    setNoteDate('');
    showToast('Recordatorio añadido');
  };

  const handleToggleNote = (id: string) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, completed: !n.completed } : n)
    }));
  };

  const handleDeleteNote = (id: string) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== id)
    }));
    showToast('Recordatorio eliminado');
  };

  // Restore Handlers
  const handleRestoreProducts = (incoming: Product[], mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setData(prev => ({ ...prev, products: incoming }));
    } else {
      setData(prev => {
        const existingNames = new Set(prev.products.map(p => p.name.toLowerCase()));
        const unique = incoming.filter(p => !existingNames.has(p.name.toLowerCase()));
        return { ...prev, products: [...prev.products, ...unique] };
      });
    }
    showToast(`¡Se han restaurado ${incoming.length} prendas!`);
  };

  const handleRestoreFullBackup = (incoming: AppData) => {
    setData(incoming);
    showToast('¡Copia de seguridad completa restaurada!');
  };

  const handleResetToDefault = () => {
    setData(loadData());
    showToast('Catálogo base restaurado.');
  };

  // Live Mode quick selling
  const handleLiveSale = (product: Product, quantity: number, channel: string) => {
    const saleRecord: Sale = {
      id: uid('s'),
      date: localDateTime(),
      payment: channel,
      comment: `Directo ${channel}`,
      items: [{
        productId: product.id,
        name: productLabel(product),
        category: product.category,
        size: product.size,
        color: product.color,
        quantity,
        price: product.price,
        unitCost: Number(product.unitCost || 0),
        total: cents(quantity * product.price),
        costTotal: cents(quantity * Number(product.unitCost || 0))
      }],
      total: cents(quantity * product.price)
    };

    setData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === product.id ? { ...p, stock: Math.max(0, p.stock - quantity) } : p),
      sales: [saleRecord, ...prev.sales]
    }));
  };

  return (
    <div className="min-h-screen bg-[#faf8fc] text-[#34283c]">
      {/* 1. Header (Sticky matching MIRANDA’S Closets+ layout) */}
      <header className="bg-white border-b border-[#eadff0] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#70419a] text-white flex items-center justify-center font-extrabold text-xl shadow-sm">
              M+
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#48245f] leading-tight m-0">
                MIRANDA’S Closets+
              </h1>
              <p className="text-[11px] text-[#83768a] m-0 font-medium">
                Tu negocio, organizado con estilo
              </p>
            </div>
          </div>

          {/* Action pills & status */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsLiveOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f5effa] text-[#70419a] hover:bg-[#eadff0] text-xs font-bold border border-[#eadff0] transition-all cursor-pointer"
              title="Abrir pantalla rápida para directos de TikTok Live"
            >
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span className="hidden sm:inline">Modo</span> TikTok Live
            </button>

            {/* Cloud Sync Status & Google Account */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="bg-[#eaf7ef] text-[#23845d] px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border border-[#d8ecdf] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#23845d] animate-pulse" />
                  <span className="hidden md:inline">En la nube (Tiempo real)</span>
                  <span className="md:hidden">En la nube</span>
                </span>
                <div className="flex items-center gap-1.5 bg-[#f5effa] py-1 px-2.5 rounded-full border border-[#eadff0]">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#70419a] text-white flex items-center justify-center text-[10px] font-bold">
                      {(currentUser.displayName || currentUser.email || 'M')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-[#48245f] hidden lg:inline max-w-[120px] truncate">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Cerrar sesión de la nube"
                    className="p-1 text-[#83768a] hover:text-[#c34b63] transition-colors cursor-pointer"
                  >
                    <LogOutIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="bg-[#f0f8f3] text-[#23845d] px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border border-[#d8ecdf] hidden sm:inline">
                  ● Guardado local
                </span>
                <button
                  onClick={handleGoogleLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#70419a] hover:bg-[#48245f] text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="Conectar con Google para sincronizar en tiempo real entre tu móvil y tu ordenador"
                >
                  <Cloud className="w-3.5 h-3.5 text-pink-200" />
                  <span>Sincronizar en la nube</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto pb-2 scrollbar-none text-xs font-semibold">
          {[
            { id: 'resumen', label: '◈ Resumen' },
            { id: 'inventario', label: '▤ Inventario' },
            { id: 'ventas', label: '＋ Ventas' },
            { id: 'finanzas', label: '€ Finanzas' },
            { id: 'fiscalidad', label: '▦ Fiscalidad' },
            { id: 'recordatorios', label: '♡ Recordatorios' },
            { id: 'copias', label: '⤓ Copias y privacidad' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentPage(tab.id as PageId)}
              className={`py-2 px-3 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                currentPage === tab.id
                  ? 'bg-[#f5effa] text-[#70419a] font-bold'
                  : 'text-[#83768a] hover:bg-gray-100/70 hover:text-[#34283c]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main App Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ================= PAGE 1: RESUMEN ================= */}
        {currentPage === 'resumen' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#48245f] m-0">¡Hola! ♡</h2>
                <p className="text-xs sm:text-sm text-[#83768a] mt-1">El centro de control de tu tienda.</p>
              </div>
              <button
                onClick={() => setCurrentPage('ventas')}
                className="px-4 py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva venta</span>
              </button>
            </div>

            {/* Row 1 Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-boutique">
                <div className="iconbox">💜</div>
                <div className="text-xs font-semibold text-[#83768a] mb-1">Ventas acumuladas</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#48245f]">{money(totalSales)}</div>
                <div className="text-[11px] text-[#83768a] mt-2">Importe bruto de operaciones registradas</div>
              </div>

              <div className="card-boutique">
                <div className="iconbox">🛍️</div>
                <div className="text-xs font-semibold text-[#83768a] mb-1">Operaciones de venta</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#48245f]">{data.sales.length}</div>
                <div className="text-[11px] text-[#83768a] mt-2">Tickets y pedidos registrados</div>
              </div>

              <div className="card-boutique">
                <div className="iconbox">📦</div>
                <div className="text-xs font-semibold text-[#83768a] mb-1">Unidades disponibles</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#48245f]">{allUnits}</div>
                <div className="text-[11px] text-[#83768a] mt-2">Tallas y variantes incluidas</div>
              </div>

              <div className="card-boutique">
                <div className="iconbox">🔔</div>
                <div className="text-xs font-semibold text-[#83768a] mb-1">Tareas pendientes</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#48245f]">
                  {data.notes.filter(n => !n.completed).length + data.fiscalTasks.filter(t => !t.completed).length}
                </div>
                <div className="text-[11px] text-[#83768a] mt-2">Recordatorios y tareas fiscales</div>
              </div>
            </div>

            {/* Row 2 Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-boutique">
                <div className="text-xs font-semibold text-[#83768a] mb-1">Compras registradas</div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#48245f]">{money(totalPurchases)}</div>
                <div className="text-[11px] text-[#83768a] mt-2">Total de facturas de mercancía</div>
              </div>

              <div className="card-boutique">
                <div className="text-xs font-semibold text-[#83768a] mb-1">Gastos registrados</div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#48245f]">{money(totalExpenses)}</div>
                <div className="text-[11px] text-[#83768a] mt-2">Envíos, embalajes y cuotas</div>
              </div>

              <div className="card-boutique">
                <div className="text-xs font-semibold text-[#83768a] mb-1">Margen estimado</div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#23845d]">{money(marginEstimate)}</div>
                <div className="text-[11px] text-[#83768a] mt-2">Antes de otros gastos; según costes</div>
              </div>

              <div className="card-boutique">
                <div className="text-xs font-semibold text-[#83768a] mb-1">Productos con stock bajo</div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#c34b63]">{lowStockProducts.length}</div>
                <div className="text-[11px] text-[#83768a] mt-2">Con 3 unidades o menos</div>
              </div>
            </div>

            {/* Two column: Recent Sales & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Últimas ventas */}
              <div className="lg:col-span-7 card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-4">Últimas ventas</h3>
                {data.sales.length === 0 ? (
                  <div className="text-center py-10 text-[#83768a] text-xs">
                    <span className="text-2xl block mb-2">🛍️</span>
                    Tus ventas aparecerán aquí.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#eadff0] text-[#83768a] uppercase text-[10px] font-bold">
                          <th className="py-2.5 px-2">Fecha</th>
                          <th className="py-2.5 px-2">Artículos</th>
                          <th className="py-2.5 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0eaf4]">
                        {data.sales.slice(0, 5).map(s => (
                          <tr key={s.id} className="hover:bg-[#f5effa]/30">
                            <td className="py-2 px-2 text-[#83768a]">{s.date.replace('T', ' ')}</td>
                            <td className="py-2 px-2 font-medium text-[#48245f]">
                              {(s.items || []).reduce((q, l) => q + Number(l.quantity || 0), 0)} uds. · {(s.items || []).map(i => i.name).join(', ')}
                            </td>
                            <td className="py-2 px-2 text-right font-extrabold text-[#48245f]">{money(s.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Stock que necesita atención */}
              <div className="lg:col-span-5 card-boutique flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#48245f] mb-4">Stock que necesita atención</h3>
                  {lowStockProducts.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#23845d]">
                      ✨ Todas las variantes superan 3 unidades.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f0eaf4] text-xs">
                      {lowStockProducts.slice(0, 5).map(p => (
                        <div key={p.id} className="py-2 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-[#48245f]">{productLabel(p)}</div>
                            <div className="text-[11px] text-[#83768a]">
                              {p.stock === 0 ? 'Sin existencias' : `Quedan ${p.stock} unidades`}
                            </div>
                          </div>
                          <span className={`pill-status ${p.stock === 0 ? 'out' : 'low'}`}>
                            {p.stock === 0 ? 'Agotado' : 'Stock bajo'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage('inventario')}
                  className="mt-4 w-full py-2.5 px-3 rounded-xl bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-xs transition-colors cursor-pointer"
                >
                  Abrir inventario
                </button>
              </div>
            </div>

            {/* Two column 2: Próximas tareas fiscales & Recordatorios */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 card-boutique flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#48245f] mb-4">Próximas tareas fiscales</h3>
                  {data.fiscalTasks.filter(t => !t.completed).length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#83768a]">No quedan tareas fiscales pendientes.</div>
                  ) : (
                    <div className="divide-y divide-[#f0eaf4] text-xs">
                      {data.fiscalTasks.filter(t => !t.completed).slice(0, 3).map(t => (
                        <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-[#48245f]">{t.text}</div>
                            <div className="text-[11px] text-[#83768a]">Recordatorio: {t.dueDate || 'Sin fecha'} · {t.model}</div>
                          </div>
                          <button
                            onClick={() => handleToggleFiscal(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-[11px] cursor-pointer shrink-0"
                          >
                            Hecho
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage('fiscalidad')}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-xs transition-colors cursor-pointer"
                >
                  Ver calendario fiscal
                </button>
              </div>

              <div className="lg:col-span-6 card-boutique flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#48245f] mb-4">Recordatorios pendientes</h3>
                  {data.notes.filter(n => !n.completed).length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#83768a]">♡ No tienes recordatorios pendientes.</div>
                  ) : (
                    <div className="divide-y divide-[#f0eaf4] text-xs">
                      {data.notes.filter(n => !n.completed).slice(0, 3).map(n => (
                        <div key={n.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-[#48245f]">{n.text}</div>
                            <div className="text-[11px] text-[#83768a]">{n.dueDate ? `Límite: ${n.dueDate}` : 'Sin fecha límite'}</div>
                          </div>
                          <button
                            onClick={() => handleToggleNote(n.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-[11px] cursor-pointer shrink-0"
                          >
                            Hecho
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage('recordatorios')}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-xs transition-colors cursor-pointer"
                >
                  Ver recordatorios
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 2: INVENTARIO ================= */}
        {currentPage === 'inventario' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#48245f] m-0">Inventario</h2>
              <p className="text-xs text-[#83768a] mt-1">Controla productos, categorías, tallas, colores y costes de compra.</p>
            </div>

            <div className="alert-amber">
              Cada combinación de talla/color se guarda como una variante independiente para que el stock no se mezcle. El coste unitario es orientativo y conviene introducirlo con los impuestos y el recargo no recuperables incluidos, cuando proceda.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Product Form */}
              <div className="lg:col-span-7 card-boutique">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#eadff0]">
                  <h3 className="text-base font-bold text-[#48245f] m-0">
                    {editingProductId ? 'Editar variante' : 'Añadir variante de producto'}
                  </h3>
                  {editingProductId && (
                    <span className="text-[11px] font-bold text-[#c34b63] bg-[#fff0f2] px-2 py-0.5 rounded-md">
                      Modificando variante
                    </span>
                  )}
                </div>

                <form onSubmit={handleProductSubmit} className="space-y-3.5 text-xs">
                  {/* Fila 1: Código + Nombre del producto + Stock inicial */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="w-full sm:w-28 shrink-0">
                      <label className="block font-bold text-[#64546e] mb-1">Código</label>
                      <input
                        type="text"
                        maxLength={7}
                        value={prodSku}
                        onChange={e => setProdSku(e.target.value.toUpperCase().slice(0, 7))}
                        placeholder="Ej. 102A01"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] focus:border-[#70419a] focus:ring-1 focus:ring-[#70419a] outline-none bg-white text-xs font-mono font-bold tracking-wider text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block font-bold text-[#64546e] mb-1">Nombre del producto *</label>
                      <input
                        type="text"
                        value={prodName}
                        onChange={e => setProdName(e.target.value)}
                        required
                        placeholder="Ej. Blusa satinada Curvy Plus"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] focus:border-[#70419a] focus:ring-1 focus:ring-[#70419a] outline-none bg-white text-xs"
                      />
                    </div>
                    <div className="w-full sm:w-28 shrink-0">
                      <label className="block font-bold text-[#64546e] mb-1">Stock *</label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        required
                        value={prodStock}
                        onChange={e => {
                          const val = e.target.value.slice(0, 3);
                          setProdStock(val);
                        }}
                        placeholder="0"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] focus:border-[#70419a] focus:ring-1 focus:ring-[#70419a] outline-none bg-white text-xs font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* Fila 2: Categoría + Talla/Medida + Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Categoría</label>
                      <select
                        value={prodCategory}
                        onChange={e => setProdCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] focus:border-[#70419a] outline-none bg-white text-xs cursor-pointer"
                      >
                        <option>Ropa</option>
                        <option>Calzado</option>
                        <option>Bisutería</option>
                        <option>Accesorios</option>
                        <option>Belleza y cosmética</option>
                        <option>Deporte</option>
                        <option>Otros</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Talla / medida</label>
                      <input
                        type="text"
                        value={prodSize}
                        onChange={e => setProdSize(e.target.value)}
                        placeholder="Ej. 44, XL, Única"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Color</label>
                      <input
                        type="text"
                        value={prodColor}
                        onChange={e => setProdColor(e.target.value)}
                        placeholder="Ej. Buganvilla, Negro"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Coste total por unidad (€) + Precio de venta agregado (Coste + 21% IVA) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-[#64546e]">Coste total por unidad (€)</label>
                        <span className="text-[10px] text-[#83768a]">Base s/IVA</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prodCost}
                        onChange={e => setProdCost(e.target.value)}
                        placeholder="0,00"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] focus:border-[#70419a] outline-none bg-white text-xs font-mono font-medium"
                      />
                      <small className="text-[10px] text-[#83768a]">Coste unitario orientativo.</small>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-[#48245f]">Precio de Venta Final *</label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={prodPrice}
                        onChange={e => setProdPrice(e.target.value)}
                        placeholder="0,00"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] focus:border-[#70419a] outline-none bg-white text-xs font-bold text-[#48245f]"
                      />
                      <small className="text-[10px] text-[#83768a]">Se reflejará en las variantes registradas.</small>
                    </div>
                  </div>

                  {/* Fila 4: Canal de Venta + Ubicación / Perchero */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Canal de Venta</label>
                      <select
                        value={prodChannel}
                        onChange={e => setProdChannel(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs cursor-pointer"
                      >
                        <option value="TikTok & WhatsApp">TikTok & WhatsApp</option>
                        <option value="Solo TikTok Shop">Solo TikTok Shop</option>
                        <option value="Solo WhatsApp">Solo WhatsApp</option>
                        <option value="Venta Física">Venta Física / Pop-up</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Ubicación / Perchero</label>
                      <input
                        type="text"
                        value={prodRack}
                        onChange={e => setProdRack(e.target.value)}
                        placeholder="Ej. Perchero 1, Perchero Rosa"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
                    >
                      {editingProductId ? 'Guardar cambios' : 'Guardar variante'}
                    </button>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2.5 rounded-xl bg-[#f5effa] text-[#70419a] font-bold text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Calculadora de IVA (Sustituye al resumen aquí) */}
              <div className="lg:col-span-5 card-boutique flex flex-col justify-between">
                <div>
                  {/* Encabezado como en la imagen */}
                  <div className="pb-3 border-b border-[#eadff0] mb-3">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-[#70419a]" />
                      Calcular IVA
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-gray-800">
                      <span>España</span>
                      <span className="font-normal text-gray-600">: tipo general:</span>
                      <span className="inline-block bg-[#97cba4] text-[#0d3b1e] border border-[#78b387] px-2 py-0.5 rounded text-xs font-black tracking-wider shadow-inner">
                        21 %
                      </span>
                    </div>
                  </div>

                  {/* Fila de acción "Rellena los campos que quieras y → [Calcular]" */}
                  <div className="flex items-center justify-between gap-2 mb-3 bg-[#fdfbfd] p-2 rounded-xl border border-[#eadff0]">
                    <span className="text-xs text-gray-700 font-medium">
                      Rellena los campos que quieras y →
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCalculateVat()}
                      className="px-3.5 py-1.5 bg-[#e2e2e6] hover:bg-[#d5d5da] active:bg-[#c8c8ce] border border-[#a6a6ad] rounded-md font-bold text-gray-900 text-xs shadow-sm cursor-pointer transition-colors"
                    >
                      Calcular
                    </button>
                  </div>

                  {/* Inputs según formato de la imagen */}
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-xs font-bold text-gray-800">IVA %:</label>
                      <div className="col-span-6">
                        <input
                          type="number"
                          value={calcVatRate}
                          onChange={e => setCalcVatRate(e.target.value)}
                          className="w-full p-1.5 text-right font-mono font-bold text-xs border border-gray-400 rounded bg-white focus:outline-none focus:border-[#70419a]"
                        />
                      </div>
                      <span className="col-span-1 text-xs font-bold text-gray-600">%</span>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-xs font-bold text-gray-800">Precio sin IVA:</label>
                      <div className="col-span-6">
                        <input
                          type="number"
                          step="0.01"
                          value={calcPriceNoVat}
                          onChange={e => {
                            setCalcPriceNoVat(e.target.value);
                            setCalcLastEdited('noVat');
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCalculateVat('noVat');
                            }
                          }}
                          placeholder="0,00"
                          className="w-full p-1.5 text-right font-mono font-bold text-xs border border-gray-400 rounded bg-white focus:outline-none focus:border-[#70419a]"
                        />
                      </div>
                      <span className="col-span-1 text-xs font-bold text-gray-600">€</span>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-xs font-bold text-gray-800">Precio con IVA:</label>
                      <div className="col-span-6">
                        <input
                          type="number"
                          step="0.01"
                          value={calcPriceWithVat}
                          onChange={e => {
                            setCalcPriceWithVat(e.target.value);
                            setCalcLastEdited('withVat');
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCalculateVat('withVat');
                            }
                          }}
                          placeholder="0,00"
                          className="w-full p-1.5 text-right font-mono font-bold text-xs border border-gray-400 rounded bg-white focus:outline-none focus:border-[#70419a] text-[#70419a]"
                        />
                      </div>
                      <span className="col-span-1 text-xs font-bold text-gray-600">€</span>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-xs font-bold text-gray-800">Importe del IVA:</label>
                      <div className="col-span-6">
                        <input
                          type="number"
                          step="0.01"
                          value={calcVatAmount}
                          onChange={e => {
                            setCalcVatAmount(e.target.value);
                            setCalcLastEdited('vatAmount');
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCalculateVat('vatAmount');
                            }
                          }}
                          placeholder="0,00"
                          className="w-full p-1.5 text-right font-mono font-medium text-xs border border-gray-400 rounded bg-white focus:outline-none focus:border-[#70419a]"
                        />
                      </div>
                      <span className="col-span-1 text-xs font-bold text-gray-600">€</span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la calculadora */}
                <div className="pt-3 border-t border-[#eadff0] mt-3">
                  <button
                    type="button"
                    onClick={handleClearCalc}
                    className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs cursor-pointer transition-colors shadow-xs"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="card-boutique">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#eadff0]">
                <h3 className="text-base font-bold text-[#48245f] m-0">Variantes registradas</h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      generateInventoryPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                      showToast('¡Descargando informe de inventario en PDF boutique!');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                    title="Descargar informe oficial de inventario en PDF estético"
                  >
                    <FileText className="w-3.5 h-3.5 text-pink-200" />
                    <span>Informe PDF</span>
                  </button>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Buscar código, nombre, talla, color…"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#eadff0] focus:border-[#70419a] outline-none text-xs bg-[#faf8fc]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#eadff0] bg-[#fbf9fd] text-[#83768a] uppercase text-[10px] font-bold">
                      <th className="py-3 px-3">Código</th>
                      <th className="py-3 px-3">Producto / variante</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3">Precio de Venta Final</th>
                      <th className="py-3 px-3">Coste/ud.</th>
                      <th className="py-3 px-3 text-center">Stock</th>
                      <th className="py-3 px-3">Estado</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eaf4]">
                    {data.products
                      .filter(p => [p.sku, p.code, p.id, p.name, p.category, p.size, p.color, p.channel, p.rackLocation].filter(Boolean).join(' ').toLowerCase().includes(productSearch.toLowerCase()))
                      .map(p => (
                        <tr key={p.id} className="hover:bg-[#f5effa]/30 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-xs bg-[#f5effa] text-[#70419a] px-2 py-1 rounded-md border border-[#eadff0] inline-block tracking-wider">
                              {p.sku || p.id.slice(-6).toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-[#48245f] text-sm sm:text-base">{productLabel(p)}</div>
                            <div className="text-[11px] text-[#83768a] flex items-center gap-2 mt-0.5">
                              {p.channel && <span>{p.channel}</span>}
                              {p.rackLocation && <span className="bg-[#f5effa] text-[#70419a] px-1.5 py-0.5 rounded text-[10px] font-semibold">{p.rackLocation}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#83768a]">{p.category}</td>
                          <td className="py-3 px-3 font-extrabold text-[#48245f]">{money(p.price)}</td>
                          <td className="py-3 px-3">
                            <div className="text-[#83768a] font-medium">{money(p.unitCost || 0)}</div>
                            <div className="text-[11px] text-[#64546e] font-semibold">
                              ({money((p.unitCost || 0) * 1.262)})
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-md font-extrabold text-sm ${
                                p.stock === 0 ? 'bg-red-50 text-red-700' : p.stock <= 3 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {p.stock}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`pill-status ${p.stock === 0 ? 'out' : p.stock <= 3 ? 'low' : ''}`}>
                              {p.stock === 0 ? 'Agotado' : p.stock <= 3 ? 'Stock bajo' : 'Disponible'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Stock controls */}
                              <button
                                onClick={() => handleChangeStockDirect(p.id, 1)}
                                title="Añadir 1 ud al stock"
                                className="w-7 h-7 rounded-lg bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold flex items-center justify-center cursor-pointer text-xs"
                              >
                                +
                              </button>
                              <button
                                onClick={() => handleChangeStockDirect(p.id, -1)}
                                title="Restar 1 ud"
                                disabled={p.stock <= 0}
                                className="w-7 h-7 rounded-lg bg-[#fff0f2] hover:bg-[#ffe0e4] text-[#c34b63] font-bold flex items-center justify-center cursor-pointer text-xs disabled:opacity-40"
                              >
                                -
                              </button>

                              {/* WhatsApp copy */}
                              <button
                                onClick={() => handleCopyWhatsApp(p)}
                                title="Copiar mensaje de WhatsApp para clienta"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                              >
                                {copiedId === p.id ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                              </button>

                              {/* Edit & Delete */}
                              <button
                                onClick={() => handleEditProduct(p)}
                                className="px-2 py-1 rounded-lg bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-[11px] cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="px-2 py-1 rounded-lg bg-[#fff0f2] hover:bg-[#ffe0e4] text-[#c34b63] font-bold text-[11px] cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen del inventario (Movido a la parte posterior) */}
            <div className="card-boutique">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#eadff0] gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#48245f] m-0">Resumen del inventario</h3>
                  <p className="text-xs text-[#83768a] m-0">Balance de existencias, productos agotados y valoración a precio de venta final.</p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#f5effa] text-[#70419a]">
                  {data.products.length} variantes registradas
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-[#faf8fc] border border-[#eadff0]">
                  <div className="text-[11px] font-semibold text-[#83768a]">Variantes registradas</div>
                  <div className="text-xl font-black text-[#48245f] mt-1">{data.products.length}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#faf8fc] border border-[#eadff0]">
                  <div className="text-[11px] font-semibold text-[#83768a]">Unidades disponibles</div>
                  <div className="text-xl font-black text-[#48245f] mt-1">{allUnits}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#faf8fc] border border-[#eadff0]">
                  <div className="text-[11px] font-semibold text-[#83768a]">Valor a Precio de Venta Final</div>
                  <div className="text-xl font-black text-[#70419a] mt-1">{money(stockTotalValue)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#faf8fc] border border-[#eadff0]">
                  <div className="text-[11px] font-semibold text-[#83768a]">Productos agotados</div>
                  <div className="text-xl font-black text-[#c34b63] mt-1">
                    {data.products.filter(p => p.stock === 0).length}
                  </div>
                </div>
              </div>

              <div className="info-purple mt-4">
                💡 <strong>Sugerencia:</strong> crea una variante distinta para “Blusa negra · S” y “Blusa negra · M”. Así cada talla tendrá su propio stock, precio de venta final y coste.
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 3: VENTAS ================= */}
        {currentPage === 'ventas' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#48245f] m-0">Ventas y carrito</h2>
              <p className="text-xs text-[#83768a] mt-1">Añade varios productos y registra una sola operación.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Cart builder */}
              <div className="lg:col-span-7 card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-4">Añadir artículos al carrito</h3>
                <form onSubmit={handleAddToCart} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#64546e] mb-1">Producto / variante disponible *</label>
                    <select
                      value={selectedCartProductId}
                      onChange={e => setSelectedCartProductId(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-[#eadff0] focus:border-[#70419a] outline-none bg-white text-xs cursor-pointer"
                    >
                      <option value="">Selecciona un producto</option>
                      {data.products.filter(p => p.stock > 0).map(p => (
                        <option key={p.id} value={p.id}>
                          {productLabel(p)} · {money(p.price)} · Stock {p.stock}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Cantidad *</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={cartQuantity}
                        onChange={e => setCartQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        required
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Precio unitario</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedCartProductId ? money(data.products.find(p => p.id === selectedCartProductId)?.price) : ''}
                        placeholder="Se calcula al elegir producto"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] bg-gray-50 text-xs font-bold text-[#48245f]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
                  >
                    ＋ Añadir al carrito
                  </button>
                </form>

                <hr className="my-6 border-t border-[#eadff0]" />

                {/* Cart Lines */}
                <h3 className="text-base font-bold text-[#48245f] mb-3">Carrito de esta venta</h3>
                {saleCart.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#83768a]">
                    <span className="text-2xl block mb-1">🛒</span>
                    El carrito está vacío.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0eaf4] text-xs">
                    {saleCart.map(line => (
                      <div key={line.productId} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[#48245f]">{line.name}</div>
                          <div className="text-[11px] text-[#83768a]">
                            {line.quantity} × {money(line.price)} = <strong className="text-[#48245f]">{money(line.quantity * line.price)}</strong>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCartLine(line.productId)}
                          className="px-2 py-1 rounded-lg bg-[#fff0f2] hover:bg-[#ffe0e4] text-[#c34b63] font-bold text-[11px] cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total Panel */}
                <div className="mt-4 p-4 rounded-xl bg-[#f5effa] border border-[#eadff0]">
                  <div className="text-xs text-[#83768a]">Total de la venta</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#48245f] mt-1">{money(cartTotal)}</div>
                  <div className="text-[11px] text-[#83768a] mt-1">Los precios son los precios finales que pagarían tus clientes.</div>
                </div>

                {/* Finalize Sale Form */}
                <form onSubmit={handleConfirmSale} className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Método de pago *</label>
                      <select
                        value={salePayment}
                        onChange={e => setSalePayment(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs cursor-pointer"
                      >
                        <option value="Bizum">Bizum</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="TikTok Shop">TikTok Shop</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Fecha y hora *</label>
                      <input
                        type="datetime-local"
                        value={saleDate}
                        onChange={e => setSaleDate(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#64546e] mb-1">Nota / referencia de pedido</label>
                    <input
                      type="text"
                      value={saleComment}
                      onChange={e => setSaleComment(e.target.value)}
                      placeholder="Ej. Pedido de Instagram, clienta Ana"
                      className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={!saleCart.length}
                      className="px-5 py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Confirmar venta
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="px-4 py-2.5 rounded-xl bg-[#f5effa] text-[#70419a] font-bold text-xs cursor-pointer"
                    >
                      Vaciar carrito
                    </button>
                  </div>
                </form>
              </div>

              {/* Sales Summary */}
              <div className="lg:col-span-5 card-boutique flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#48245f] mb-4">Resumen de ventas</h3>
                  <div className="divide-y divide-[#f0eaf4] text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-[#83768a]">Total acumulado</span>
                      <strong className="text-[#48245f] text-sm">{money(totalSales)}</strong>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-[#83768a]">Ventas de hoy</span>
                      <strong className="text-[#23845d] text-sm">{money(todaySalesTotal)}</strong>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-[#83768a]">Operaciones registradas</span>
                      <strong className="text-[#48245f] text-sm">{data.sales.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="info-purple mt-6">
                  Si confirmas una operación por error, puedes anularla desde el historial. Las unidades volverán al inventario y los totales se recalcularán.
                </div>
              </div>
            </div>

            {/* Sales History Table */}
            <div className="card-boutique">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#eadff0]">
                <h3 className="text-base font-bold text-[#48245f] m-0">Historial de ventas</h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      generateSalesPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                      showToast('¡Descargando informe de ventas en PDF boutique!');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                    title="Descargar informe oficial de ventas en PDF estético"
                  >
                    <FileText className="w-3.5 h-3.5 text-pink-200" />
                    <span>Informe PDF</span>
                  </button>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={salesSearch}
                      onChange={e => setSalesSearch(e.target.value)}
                      placeholder="Buscar fecha, producto o pago…"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#eadff0] outline-none text-xs bg-[#faf8fc]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#eadff0] bg-[#fbf9fd] text-[#83768a] uppercase text-[10px] font-bold">
                      <th className="py-3 px-3">Fecha</th>
                      <th className="py-3 px-3">Artículos</th>
                      <th className="py-3 px-3">Pago</th>
                      <th className="py-3 px-3 text-right">Total</th>
                      <th className="py-3 px-3">Nota</th>
                      <th className="py-3 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eaf4]">
                    {data.sales
                      .filter(s => [s.date, s.payment, s.comment, (s.items || []).map(l => l.name).join(' ')].join(' ').toLowerCase().includes(salesSearch.toLowerCase()))
                      .map(s => (
                        <tr key={s.id} className="hover:bg-[#f5effa]/30">
                          <td className="py-3 px-3 text-[#83768a]">{s.date.replace('T', ' ')}</td>
                          <td className="py-3 px-3 font-medium text-[#48245f]">
                            {(s.items || []).map((l, i) => (
                              <div key={i}>{l.name} × {l.quantity}</div>
                            ))}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-[#f5effa] text-[#70419a] font-bold text-[10px]">
                              {s.payment}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-[#48245f] text-sm">
                            {money(s.total)}
                          </td>
                          <td className="py-3 px-3 text-[#83768a]">{s.comment || '—'}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleCancelSale(s.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#fff0f2] hover:bg-[#ffe0e4] text-[#c34b63] font-bold text-[11px] cursor-pointer"
                            >
                              Anular
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 4: FINANZAS ================= */}
        {currentPage === 'finanzas' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-[#48245f] m-0">Finanzas, compras y gastos</h2>
                <p className="text-xs text-[#83768a] mt-1">Reúne facturas de proveedores, gastos y estimaciones para revisar tu negocio.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    generatePurchasesPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                    showToast('¡Descargando informe de compras y facturas en PDF!');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Descargar informe oficial de compras a proveedores en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-pink-200" />
                  <span>Informe Compras PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generateExpensesPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                    showToast('¡Descargando informe de gastos operativos en PDF!');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Descargar informe oficial de gastos en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-pink-200" />
                  <span>Informe Gastos PDF</span>
                </button>
              </div>
            </div>

            <div className="alert-amber">
              Los datos y cálculos son orientativos. En recargo de equivalencia, el IVA y el recargo pagados en compras normalmente forman parte del coste de adquisición y no son un “IVA a recuperar”. No uses estas cifras como una liquidación fiscal automática.
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-boutique">
                <div className="text-xs font-semibold text-[#83768a] mb-1">Ventas registradas</div>
                <div className="text-2xl font-extrabold text-[#48245f]">{money(totalSales)}</div>
              </div>
              <div className="card-boutique">
                <div className="text-xs font-semibold text-[#83768a] mb-1">Compras de mercancía</div>
                <div className="text-2xl font-extrabold text-[#48245f]">{money(totalPurchases)}</div>
              </div>
              <div className="card-boutique">
                <div className="text-xs font-semibold text-[#83768a] mb-1">Otros gastos</div>
                <div className="text-2xl font-extrabold text-[#48245f]">{money(totalExpenses)}</div>
              </div>
              <div className="card-boutique">
                <div className="text-xs font-semibold text-[#83768a] mb-1">Margen orientativo</div>
                <div className="text-2xl font-extrabold text-[#23845d]">{money(marginEstimate)}</div>
                <div className="text-[10px] text-[#83768a] mt-1">Ventas − coste vendido − gastos</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Purchase Invoice Form */}
              <div className="lg:col-span-7 card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-4">Registrar factura de compra de mercancía</h3>
                <form onSubmit={handlePurchaseSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Proveedor *</label>
                      <input
                        type="text"
                        value={purchaseSupplier}
                        onChange={e => setPurchaseSupplier(e.target.value)}
                        required
                        placeholder="Nombre del proveedor"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">N.º de factura *</label>
                      <input
                        type="text"
                        value={purchaseInvoice}
                        onChange={e => setPurchaseInvoice(e.target.value)}
                        required
                        placeholder="F-2026-001"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Fecha de factura *</label>
                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={e => setPurchaseDate(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Notas</label>
                      <input
                        type="text"
                        value={purchaseNotes}
                        onChange={e => setPurchaseNotes(e.target.value)}
                        placeholder="Ej. pedido de otoño"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                  </div>

                  <hr className="my-4 border-t border-[#eadff0]" />
                  <h4 className="font-bold text-[#48245f] text-xs">Mercancía comprada (para sumar al stock)</h4>

                  <div>
                    <label className="block font-bold text-[#64546e] mb-1">Producto / variante *</label>
                    <select
                      value={purchaseSelectedProd}
                      onChange={e => {
                        setPurchaseSelectedProd(e.target.value);
                        const p = data.products.find(x => x.id === e.target.value);
                        if (p && !purchaseUnitCost) setPurchaseUnitCost(String(p.unitCost || ''));
                      }}
                      className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs cursor-pointer"
                    >
                      <option value="">Elige una variante ya creada</option>
                      {data.products.map(p => (
                        <option key={p.id} value={p.id}>
                          {productLabel(p)} · stock {p.stock}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Unidades compradas *</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={purchaseQty}
                        onChange={e => setPurchaseQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Coste por unidad (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={purchaseUnitCost}
                        onChange={e => setPurchaseUnitCost(e.target.value)}
                        placeholder="Coste total unitario"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPurchaseLine}
                    className="px-3.5 py-2 rounded-xl bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-xs cursor-pointer"
                  >
                    ＋ Añadir línea de mercancía
                  </button>

                  {/* Lines list */}
                  <div className="space-y-1.5 pt-2">
                    {purchaseLines.map(line => (
                      <div key={line.productId} className="py-2 px-3 rounded-lg bg-gray-50 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-[#48245f]">{line.name}</strong>
                          <div className="text-[11px] text-[#83768a]">{line.quantity} uds. · {money(line.unitCost)}/ud.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePurchaseLine(line.productId)}
                          className="text-[#c34b63] font-bold text-[11px] hover:underline cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>

                  <hr className="my-4 border-t border-[#eadff0]" />
                  <h4 className="font-bold text-[#48245f] text-xs">Totales tal como aparecen en la factura</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Base (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={purchaseBase}
                        onChange={e => setPurchaseBase(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">IVA (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={purchaseVat}
                        onChange={e => setPurchaseVat(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Recargo (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={purchaseSurcharge}
                        onChange={e => setPurchaseSurcharge(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#64546e] mb-1">Otros importes / portes (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchaseOther}
                      onChange={e => setPurchaseOther(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[#eadff0] outline-none text-xs"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#f5effa] border border-[#eadff0]">
                    <div className="text-xs text-[#83768a]">Total calculado de la factura</div>
                    <div className="text-2xl font-black text-[#48245f] mt-1">{money(purchaseCalculatedTotal)}</div>
                    <div className="text-[10px] text-[#83768a] mt-0.5">Suma base + IVA + recargo + otros importes.</div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
                  >
                    Guardar factura y actualizar stock
                  </button>
                </form>
              </div>

              {/* Expense Form & Resumen de impuestos */}
              <div className="lg:col-span-5 space-y-6">
                <div className="card-boutique">
                  <h3 className="text-base font-bold text-[#48245f] mb-4">Registrar otro gasto</h3>
                  <form onSubmit={handleExpenseSubmit} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-[#64546e] mb-1">Fecha *</label>
                        <input
                          type="date"
                          value={expenseDate}
                          onChange={e => setExpenseDate(e.target.value)}
                          required
                          className="w-full p-2 rounded-xl border border-[#eadff0] outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#64546e] mb-1">Categoría *</label>
                        <select
                          value={expenseCategory}
                          onChange={e => setExpenseCategory(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#eadff0] outline-none bg-white text-xs cursor-pointer"
                        >
                          <option>Envíos y embalaje</option>
                          <option>Publicidad</option>
                          <option>Comisiones de plataforma</option>
                          <option>Cuota de autónomos</option>
                          <option>Gestoría y servicios</option>
                          <option>Material de oficina</option>
                          <option>Telefonía e internet</option>
                          <option>Otro</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Descripción *</label>
                      <input
                        type="text"
                        value={expenseDescription}
                        onChange={e => setExpenseDescription(e.target.value)}
                        required
                        placeholder="Ej. etiquetas y sobres de envío"
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-[#64546e] mb-1">Importe total (€) *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={expenseAmount}
                          onChange={e => setExpenseAmount(e.target.value)}
                          placeholder="25.00"
                          className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#64546e] mb-1">IVA incluido (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={expenseVat}
                          onChange={e => setExpenseVat(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
                    >
                      Guardar gasto
                    </button>
                  </form>
                </div>

                <div className="card-boutique">
                  <h3 className="text-base font-bold text-[#48245f] mb-3">Resumen de impuestos en compras</h3>
                  <div className="divide-y divide-[#f0eaf4] text-xs">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-[#83768a]">IVA anotado en compras</span>
                      <strong className="text-[#48245f]">
                        {money(data.purchases.reduce((s, p) => s + Number(p.iva || 0), 0))}
                      </strong>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-[#83768a]">Recargo anotado en facturas</span>
                      <strong className="text-[#48245f]">
                        {money(data.purchases.reduce((s, p) => s + Number(p.recargo || 0), 0))}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchases & Expenses Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-3">Facturas de compra</h3>
                {data.purchases.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#83768a]">Aún no has guardado facturas de compra.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#eadff0] text-[#83768a] text-[10px] uppercase font-bold">
                          <th className="py-2.5 px-2">Fecha / factura</th>
                          <th className="py-2.5 px-2">Proveedor</th>
                          <th className="py-2.5 px-2">Total</th>
                          <th className="py-2.5 px-2">IVA / RE</th>
                          <th className="py-2.5 px-2 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0eaf4]">
                        {data.purchases.map(p => (
                          <tr key={p.id}>
                            <td className="py-2 px-2 text-[#83768a]">{p.date}<br />{p.invoice}</td>
                            <td className="py-2 px-2 font-bold text-[#48245f]">{p.supplier}</td>
                            <td className="py-2 px-2 font-bold">{money(p.total)}</td>
                            <td className="py-2 px-2 text-[#83768a]">{money(p.iva)}<br />{money(p.recargo)}</td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => handleDeletePurchase(p.id)}
                                className="px-2 py-1 rounded bg-[#fff0f2] text-[#c34b63] font-bold text-[11px] cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-3">Gastos registrados</h3>
                {data.expenses.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#83768a]">Aún no has guardado gastos.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#eadff0] text-[#83768a] text-[10px] uppercase font-bold">
                          <th className="py-2.5 px-2">Fecha</th>
                          <th className="py-2.5 px-2">Concepto</th>
                          <th className="py-2.5 px-2 text-right">Importe</th>
                          <th className="py-2.5 px-2 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0eaf4]">
                        {data.expenses.map(ex => (
                          <tr key={ex.id}>
                            <td className="py-2 px-2 text-[#83768a]">{ex.date}</td>
                            <td className="py-2 px-2">
                              <strong className="text-[#48245f]">{ex.description}</strong>
                              <div className="text-[10px] text-[#83768a]">{ex.category}</div>
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-[#48245f]">{money(ex.amount)}</td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => handleDeleteExpense(ex.id)}
                                className="px-2 py-1 rounded bg-[#fff0f2] text-[#c34b63] font-bold text-[11px] cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 5: FISCALIDAD ================= */}
        {currentPage === 'fiscalidad' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-[#48245f] m-0">Fiscalidad y calendario</h2>
                <p className="text-xs text-[#83768a] mt-1">Una lista de preparación para que puedas presentar tus obligaciones con orden.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    generateTasksAndNotesPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                    showToast('¡Descargando informe fiscal y recordatorios en PDF!');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Descargar informe oficial fiscal en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-pink-200" />
                  <span>Informe Fiscal PDF</span>
                </button>
                <a
                  href="https://sede.agenciatributaria.gob.es/Sede/calendario-contribuyente.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span>Calendario oficial</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="alert-amber">
              <strong>Importante:</strong> las fechas de esta aplicación son recordatorios para preparar y revisar documentación, no plazos legales garantizados. Confirma cada obligación en la AEAT y según tu régimen de IRPF. El recargo de equivalencia no sustituye ni determina por sí mismo el régimen de IRPF.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Add Fiscal Task */}
              <div className="lg:col-span-6 card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-4">Añadir una tarea fiscal</h3>
                <form onSubmit={handleTaxSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#64546e] mb-1">Tarea *</label>
                    <input
                      type="text"
                      value={taxText}
                      onChange={e => setTaxText(e.target.value)}
                      required
                      placeholder="Ej. Revisar documentación de IRPF del trimestre"
                      className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Fecha para recordártelo *</label>
                      <input
                        type="date"
                        value={taxDate}
                        onChange={e => setTaxDate(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Tipo</label>
                      <select
                        value={taxModel}
                        onChange={e => setTaxModel(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs cursor-pointer"
                      >
                        <option>General</option>
                        <option>Modelo 036</option>
                        <option>IRPF / modelo 130</option>
                        <option>IRPF / modelo 131</option>
                        <option>Declaración de la renta</option>
                        <option>IVA / operación especial</option>
                        <option>Facturas y libros</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
                  >
                    ＋ Añadir al calendario
                  </button>
                </form>
              </div>

              {/* Renta Checklist */}
              <div className="lg:col-span-6 card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-3">Lista para preparar la declaración de la renta</h3>
                <div className="space-y-2.5 text-xs">
                  {RENTACHECK_ITEMS.map((item, idx) => {
                    const isChecked = data.rentaChecks.includes(idx);
                    return (
                      <label key={idx} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRentaCheck(idx)}
                          className="w-4 h-4 mt-0.5 accent-[#70419a] shrink-0"
                        />
                        <div>
                          <strong className={isChecked ? 'line-through text-[#83768a]' : 'text-[#48245f]'}>
                            {item[0]}
                          </strong>
                          <div className="text-[11px] text-[#83768a] leading-tight mt-0.5">{item[1]}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tasks Calendar Filter & List */}
            <div className="card-boutique">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#eadff0]">
                <h3 className="text-base font-bold text-[#48245f] m-0">Calendario de tareas fiscales</h3>
                <select
                  value={taxFilter}
                  onChange={e => setTaxFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-[#eadff0] text-xs bg-white cursor-pointer"
                >
                  <option value="all">Todas</option>
                  <option value="pending">Pendientes</option>
                  <option value="completed">Completadas</option>
                </select>
              </div>

              <div className="mt-3 divide-y divide-[#f0eaf4] text-xs">
                {data.fiscalTasks
                  .filter(t => taxFilter === 'all' || (taxFilter === 'pending' ? !t.completed : t.completed))
                  .map(t => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={() => handleToggleFiscal(t.id)}
                          className="w-4 h-4 mt-0.5 accent-[#70419a] shrink-0 cursor-pointer"
                        />
                        <div>
                          <div className={`font-bold ${t.completed ? 'line-through text-[#83768a]' : 'text-[#48245f]'}`}>
                            {t.text}
                          </div>
                          <div className="text-[11px] text-[#83768a]">
                            Recordatorio: {t.dueDate || 'Sin fecha'} · {t.model} {t.system && '· Tarea inicial'}
                            {!t.completed && t.dueDate && t.dueDate < isoToday() && (
                              <span className="text-[#c34b63] font-bold ml-1">· Vencido</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!t.system && (
                        <button
                          onClick={() => handleDeleteFiscal(t.id)}
                          className="px-2 py-1 rounded bg-[#fff0f2] text-[#c34b63] font-bold text-[11px] cursor-pointer"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 6: RECORDATORIOS ================= */}
        {currentPage === 'recordatorios' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#48245f] m-0">Recordatorios</h2>
              <p className="text-xs text-[#83768a] mt-1">Pedidos, compras, tareas diarias y todo lo que quieras tener presente.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form */}
              <div className="lg:col-span-7 card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-4">Crear recordatorio</h3>
                <form onSubmit={handleNoteSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#64546e] mb-1">¿Qué necesitas recordar? *</label>
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      required
                      rows={3}
                      placeholder="Ej. Pedir más bolsas para envíos o percheros para TikTok"
                      className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Fecha límite (opcional)</label>
                      <input
                        type="date"
                        value={noteDate}
                        onChange={e => setNoteDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#64546e] mb-1">Categoría</label>
                      <select
                        value={noteCategory}
                        onChange={e => setNoteCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#eadff0] outline-none bg-white text-xs cursor-pointer"
                      >
                        <option>General</option>
                        <option>Pedidos</option>
                        <option>Proveedores</option>
                        <option>Marketing y redes</option>
                        <option>Fiscal</option>
                        <option>Inventario</option>
                        <option>Personal</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
                  >
                    ＋ Añadir recordatorio
                  </button>
                </form>
              </div>

              {/* Status */}
              <div className="lg:col-span-5 card-boutique flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#48245f] mb-4">Estado de las tareas</h3>
                  <div className="divide-y divide-[#f0eaf4] text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-[#83768a]">Pendientes</span>
                      <strong className="text-[#48245f] text-sm">{data.notes.filter(n => !n.completed).length}</strong>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-[#83768a]">Completadas</span>
                      <strong className="text-[#23845d] text-sm">{data.notes.filter(n => n.completed).length}</strong>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-[#83768a]">Total</span>
                      <strong className="text-[#48245f] text-sm">{data.notes.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="info-purple mt-6">
                  Los recordatorios se guardan en este navegador. No generan avisos del sistema cuando la aplicación está cerrada.
                </div>
              </div>
            </div>

            {/* List */}
            <div className="card-boutique">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#eadff0]">
                <h3 className="text-base font-bold text-[#48245f] m-0">Mis recordatorios</h3>
                <select
                  value={noteFilter}
                  onChange={e => setNoteFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-[#eadff0] text-xs bg-white cursor-pointer"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="completed">Completados</option>
                </select>
              </div>

              <div className="mt-3 divide-y divide-[#f0eaf4] text-xs">
                {data.notes.filter(n => noteFilter === 'all' || (noteFilter === 'pending' ? !n.completed : n.completed)).length === 0 ? (
                  <div className="text-center py-6 text-[#83768a]">No hay recordatorios en esta categoría.</div>
                ) : (
                  data.notes
                    .filter(n => noteFilter === 'all' || (noteFilter === 'pending' ? !n.completed : n.completed))
                    .map(n => (
                      <div key={n.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={n.completed}
                            onChange={() => handleToggleNote(n.id)}
                            className="w-4 h-4 mt-0.5 accent-[#70419a] shrink-0 cursor-pointer"
                          />
                          <div>
                            <div className={`font-bold ${n.completed ? 'line-through text-[#83768a]' : 'text-[#48245f]'}`}>
                              {n.text}
                            </div>
                            <div className="text-[11px] text-[#83768a]">
                              {n.category || 'General'} · {n.dueDate ? `Fecha límite: ${n.dueDate}` : 'Sin fecha límite'}
                              {!n.completed && n.dueDate && n.dueDate < isoToday() && (
                                <span className="text-[#c34b63] font-bold ml-1">· Vencido</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(n.id)}
                          className="px-2 py-1 rounded bg-[#fff0f2] text-[#c34b63] font-bold text-[11px] cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 7: COPIAS Y PRIVACIDAD ================= */}
        {currentPage === 'copias' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#48245f] m-0">Copias de seguridad y privacidad</h2>
              <p className="text-xs text-[#83768a] mt-1">Guarda una copia de tus datos y comprende dónde se almacenan.</p>
            </div>

            {/* Cloud Real-time Sync Card */}
            <div className="card-boutique bg-gradient-to-r from-[#f5effa] to-white border-2 border-[#eadff0]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-[#70419a] text-white shadow-xs">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#48245f] m-0">
                      Sincronización en la Nube en Tiempo Real
                    </h3>
                    <p className="text-xs text-[#83768a] mt-0.5">
                      {currentUser 
                        ? `Conectado como ${currentUser.displayName || currentUser.email} · Base de datos compartida en vivo para todo el equipo (móvil y PC).`
                        : 'Inicia sesión con Google para sincronizar en tiempo real con tu equipo y entre móvil y ordenador.'}
                    </p>
                  </div>
                </div>

                <div>
                  {currentUser ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            setSyncStatus('syncing');
                            await pushStoreDataToCloud(currentUser.uid, data);
                            setSyncStatus('cloud');
                            showToast('¡Datos subidos y sincronizados con la nube!');
                          } catch (err) {
                            showToast('Error al sincronizar con la nube.');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                      >
                        Subir a la nube ahora
                      </button>
                      <button
                        onClick={handleLogout}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-gray-100 text-[#c34b63] font-bold text-xs border border-[#eadff0] cursor-pointer transition-colors"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleLogin}
                      className="px-4 py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-sm cursor-pointer transition-colors flex items-center gap-2"
                    >
                      <Cloud className="w-4 h-4 text-pink-200" />
                      <span>Activar con Google</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="good-green">
              <strong>Privacidad y seguridad:</strong> Cada cuenta dispone de su propio espacio privado protegido por reglas de seguridad en Firebase Firestore. Solo tú tienes acceso a tus datos.
            </div>

            <div className="alert-amber">
              <strong>Modo sin conexión:</strong> Aunque no tengas internet temporalmente, la aplicación seguirá funcionando con los datos locales guardados y se sincronizará automáticamente en cuanto recuperes conexión.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Export Full */}
              <div className="card-boutique">
                <h3 className="text-base font-bold text-[#48245f] mb-2">Exportar copia completa</h3>
                <p className="text-xs text-[#83768a] mb-4">
                  Descarga un archivo JSON con productos, ventas, compras, gastos y tareas. Es la copia que debes guardar en un lugar privado.
                </p>
                <button
                  onClick={() => exportBackup(data)}
                  className="w-full py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
                >
                  ⤓ Descargar copia de seguridad (.json)
                </button>

                <hr className="my-6 border-t border-[#eadff0]" />

                <h3 className="text-base font-bold text-[#48245f] mb-2">Restaurar una copia</h3>
                <p className="text-xs text-[#83768a] mb-4">
                  Importar una copia sustituirá los datos actuales o te permitirá recuperar lo que te dio Gemini.
                </p>
                <button
                  onClick={() => setIsRestoreOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-xs cursor-pointer transition-colors"
                >
                  Abrir asistente de restauración y pegado Gemini
                </button>
              </div>

              {/* Export PDFs */}
              <div className="card-boutique">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-[#48245f] m-0">Informes Oficiales en PDF (Diseño Boutique)</h3>
                  <span className="text-[10px] bg-[#f5effa] text-[#70419a] px-2.5 py-1 rounded-full font-bold border border-[#eadff0]">
                    A4 Imprimible & Descargable
                  </span>
                </div>
                <p className="text-xs text-[#83768a] leading-relaxed mb-4">
                  Genera y descarga informes ejecutivos oficiales con la identidad de <strong>Miranda’s Closets+ · Sevilla</strong>, métricas clave (KPIs), tablas completas, formateo de importes y numeración de páginas para gestoría, socios o archivo.
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      generateInventoryPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                      showToast('¡Informe de inventario en PDF generado con éxito!');
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs text-left cursor-pointer transition-all flex items-center justify-between shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-pink-200" />
                      <span>Informe de inventario y stock en PDF</span>
                    </div>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold group-hover:bg-white/30">
                      Inventario PDF
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      generateSalesPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                      showToast('¡Informe de ventas y pedidos en PDF generado con éxito!');
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs text-left cursor-pointer transition-all flex items-center justify-between shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-pink-200" />
                      <span>Informe de ventas, pedidos y cobros en PDF</span>
                    </div>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold group-hover:bg-white/30">
                      Ventas PDF
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      generatePurchasesPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                      showToast('¡Informe de compras y facturas en PDF generado con éxito!');
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs text-left cursor-pointer transition-all flex items-center justify-between shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-pink-200" />
                      <span>Informe de compras y facturas con recargo en PDF</span>
                    </div>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold group-hover:bg-white/30">
                      Compras PDF
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      generateExpensesPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                      showToast('¡Informe de gastos operativos en PDF generado con éxito!');
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs text-left cursor-pointer transition-all flex items-center justify-between shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-pink-200" />
                      <span>Informe de gastos operativos y envíos en PDF</span>
                    </div>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold group-hover:bg-white/30">
                      Gastos PDF
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      generateTasksAndNotesPDF(data, currentUser?.displayName || currentUser?.email || 'Alex');
                      showToast('¡Informe fiscal y recordatorios en PDF generado con éxito!');
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs text-left cursor-pointer transition-all flex items-center justify-between shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-pink-200" />
                      <span>Informe de obligaciones fiscales y recordatorios en PDF</span>
                    </div>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold group-hover:bg-white/30">
                      Fiscal PDF
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="card-boutique">
              <h3 className="text-base font-bold text-[#48245f] mb-3">Consejos para mantener los datos privados</h3>
              <div className="divide-y divide-[#f0eaf4] text-xs text-[#34283c]">
                <div className="py-2">1. Mantén un PIN o contraseña fuerte de bloqueo de tu dispositivo o tablet.</div>
                <div className="py-2">2. Evita compartir el archivo HTML y las copias JSON/CSV; pueden contener información comercial sensible.</div>
                <div className="py-2">3. Guarda una copia en una ubicación que controles y que no esté compartida públicamente.</div>
                <div className="py-2">4. Los datos del navegador pueden borrarse si limpias almacenamiento o reinstalas aplicaciones; exporta copias periódicas.</div>
                <div className="py-2">5. Esta página no es un sistema contable homologado ni almacena los PDF/fotos de las facturas: conserva los documentos originales aparte.</div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-[#83768a] border-t border-[#eadff0] pt-6">
          MIRANDA’S Closets+ · Gestión local · No sustituye los modelos oficiales ni la documentación original.
        </footer>
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#48245f] text-white px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* MODAL 1: TIKTOK LIVE SCREEN */}
      <LiveModeModal
        isOpen={isLiveOpen}
        onClose={() => setIsLiveOpen(false)}
        products={data.products}
        onChangeStock={(idx, delta) => {
          const target = data.products[idx];
          if (target) handleChangeStockDirect(target.id, delta);
        }}
        onRegisterSale={(prod, qty, channel) => handleLiveSale(prod, qty, channel)}
      />

      {/* MODAL 2: RESTORE & BACKUP CENTER (with Gemini HTML code analyzer) */}
      <RestoreBackupModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        appData={data}
        onRestoreProducts={handleRestoreProducts}
        onRestoreFullBackup={handleRestoreFullBackup}
        onResetToDefault={handleResetToDefault}
      />

      {/* CONFIRMATION DIALOG MODAL (Guaranteed to work in iframes without native confirm block) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#eadff0] p-6 animate-scaleUp">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${confirmDialog.isDanger ? 'bg-red-50 text-[#c34b63]' : 'bg-[#f5effa] text-[#70419a]'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-[#48245f] m-0">
                {confirmDialog.title}
              </h3>
            </div>
            <p className="text-xs text-[#34283c] leading-relaxed mb-5">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer transition-colors"
              >
                {confirmDialog.cancelLabel || 'Cancelar'}
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm cursor-pointer transition-colors ${
                  confirmDialog.isDanger ? 'bg-[#c34b63] hover:bg-[#a83c52]' : 'bg-[#70419a] hover:bg-[#48245f]'
                }`}
              >
                {confirmDialog.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
