import { AppData, Product, Sale, Purchase, Expense, FiscalTask, Note } from '../types/inventory';

export const KEY_V2 = 'mirandasClosetsPlus_v2';
export const KEY_V1 = 'mirandasClosetsPlus_v1';
export const KEY_LEGACY_PRO = 'mirandas_inventory_pro_v2';
export const KEY_LEGACY = 'mirandas_inventory';

export const uid = (prefix: string) => prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

export const isoToday = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export const localDateTime = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const cents = (n: number | string | undefined | null): number => {
  return Math.round((Number(n) || 0) * 100) / 100;
};

export const money = (n: number | string | undefined | null): string => {
  return Number(n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
};

export function defaultFiscalTasks(): FiscalTask[] {
  return [
    { id: uid('f'), text: 'Antes de iniciar: comprobar alta censal (modelo 036), epígrafes, régimen de IVA y modalidad de IRPF', dueDate: '2026-11-10', model: 'Modelo 036', completed: false, system: true },
    { id: uid('f'), text: 'Ordenar facturas de compras, gastos y justificantes del cuarto trimestre de 2026', dueDate: '2027-01-10', model: 'Facturas y libros', completed: false, system: true },
    { id: uid('f'), text: 'Confirmar con la AEAT qué modelo de IRPF corresponde (130 o 131, si procede) y el plazo oficial del cuarto trimestre', dueDate: '2027-01-10', model: 'IRPF / modelos 130 o 131', completed: false, system: true },
    { id: uid('f'), text: 'Preparar cierre del ejercicio 2026: ventas, gastos, compras, existencias y costes de mercancía', dueDate: '2027-02-01', model: 'Facturas y libros', completed: false, system: true },
    { id: uid('f'), text: 'Preparar documentación para la declaración de la Renta del ejercicio 2026; revisar cuándo abre la campaña de 2027', dueDate: '2027-04-01', model: 'Declaración de la renta', completed: false, system: true },
    { id: uid('f'), text: 'Revisar documentación del primer trimestre y confirmar qué obligaciones de IRPF aplican y su plazo oficial', dueDate: '2027-04-05', model: 'IRPF / modelos 130 o 131', completed: false, system: true },
    { id: uid('f'), text: 'Revisar documentación del segundo trimestre y confirmar qué obligaciones de IRPF aplican y su plazo oficial', dueDate: '2027-07-05', model: 'IRPF / modelos 130 o 131', completed: false, system: true },
    { id: uid('f'), text: 'Revisar documentación del tercer trimestre y confirmar qué obligaciones de IRPF aplican y su plazo oficial', dueDate: '2027-10-05', model: 'IRPF / modelos 130 o 131', completed: false, system: true }
  ];
}

export function defaultInitialProducts(): Product[] {
  return [
    {
      id: uid('p'),
      name: 'Conjunto Punto Otoño',
      category: 'Ropa',
      size: 'Curvy (44-52)',
      color: 'Camel / Beige',
      price: 29.99,
      unitCost: 12.00,
      stock: 2,
      channel: 'TikTok & WhatsApp',
      rackLocation: 'Perchero A1'
    },
    {
      id: uid('p'),
      name: 'Vestido Midi Invitada',
      category: 'Ropa',
      size: 'Talla Única Plus',
      color: 'Frambuesa',
      price: 39.99,
      unitCost: 16.50,
      stock: 2,
      channel: 'TikTok & WhatsApp',
      rackLocation: 'Perchero A2'
    },
    {
      id: uid('p'),
      name: 'Bolso Shopper Casual',
      category: 'Accesorios',
      size: 'Grande',
      color: 'Negro',
      price: 19.99,
      unitCost: 8.00,
      stock: 2,
      channel: 'TikTok & WhatsApp',
      rackLocation: 'Mostrador'
    }
  ];
}

export function initialData(): AppData {
  return {
    schema: 2,
    products: defaultInitialProducts(),
    sales: [],
    purchases: [],
    expenses: [],
    notes: [
      { id: uid('n'), text: 'Preparar percheros y luces para el directo de TikTok Live', dueDate: isoToday(), category: 'Marketing y redes', completed: false, createdAt: new Date().toISOString() },
      { id: uid('n'), text: 'Enviar paquetes confirmados por WhatsApp a las clientas de Sevilla', dueDate: isoToday(), category: 'Pedidos', completed: false, createdAt: new Date().toISOString() }
    ],
    fiscalTasks: defaultFiscalTasks(),
    rentaChecks: [],
    createdAt: new Date().toISOString()
  };
}

export function normalizeData(d: any): AppData {
  if (!d) throw new Error('Formato no válido');
  
  const rawProducts = Array.isArray(d.products) ? d.products : [];
  const products: Product[] = rawProducts.map((p: any, idx: number) => {
    // Parse price if string like "29.99 €"
    let price = typeof p.price === 'number' ? p.price : parseFloat(String(p.price || 0).replace('€', '').replace(',', '.'));
    if (isNaN(price)) price = 29.99;
    
    let unitCost = typeof p.unitCost === 'number' ? p.unitCost : (typeof p.cost === 'number' ? p.cost : parseFloat(String(p.cost || p.unitCost || 0).replace('€', '').replace(',', '.')));
    if (isNaN(unitCost)) unitCost = 0;

    return {
      id: String(p.id || uid('p') + idx),
      name: String(p.name || p.prenda || 'Prenda').trim(),
      category: p.category || p.categoria || 'Ropa',
      size: p.size || p.talla || '',
      color: p.color || '',
      price: cents(price),
      unitCost: cents(unitCost),
      stock: Number.isInteger(Number(p.stock)) ? Number(p.stock) : Math.max(0, parseInt(String(p.stock || 0), 10)),
      channel: p.channel || p.canal || 'TikTok & WhatsApp',
      rackLocation: p.rackLocation || p.perchero || ''
    };
  });

  const rawSales = Array.isArray(d.sales) ? d.sales : [];
  const sales: Sale[] = rawSales.map((s: any) => {
    let items = Array.isArray(s.items) ? s.items : [];
    if (!items.length) {
      const priceNum = typeof s.price === 'number' ? s.price : parseFloat(String(s.price || 0).replace('€', '').replace(',', '.'));
      items = [{
        productId: String(s.productId || ''),
        name: s.productName || 'Venta anterior',
        category: 'Ropa',
        size: '',
        color: '',
        quantity: Number(s.quantity || 1),
        price: Number(priceNum || 0),
        unitCost: 0,
        total: Number(s.total || priceNum || 0),
        costTotal: 0
      }];
    }
    return {
      id: String(s.id || uid('s')),
      date: s.date || new Date().toISOString(),
      payment: s.payment || 'Bizum',
      comment: s.comment || '',
      items,
      total: cents(s.total || items.reduce((acc: number, it: any) => acc + (it.total || it.quantity * it.price), 0))
    };
  });

  const purchases: Purchase[] = Array.isArray(d.purchases) ? d.purchases : [];
  const expenses: Expense[] = Array.isArray(d.expenses) ? d.expenses : [];
  const notes: Note[] = Array.isArray(d.notes) ? d.notes.map((n: any) => ({
    id: String(n.id || uid('n')),
    text: String(n.text || ''),
    dueDate: n.dueDate || '',
    category: n.category || 'General',
    completed: Boolean(n.completed),
    createdAt: n.createdAt || new Date().toISOString()
  })) : [];

  let fiscalTasks: FiscalTask[] = Array.isArray(d.fiscalTasks) ? d.fiscalTasks : [];
  if (!fiscalTasks.length) fiscalTasks = defaultFiscalTasks();

  const rentaChecks: number[] = Array.isArray(d.rentaChecks) ? d.rentaChecks : [];

  return {
    schema: 2,
    products,
    sales,
    purchases,
    expenses,
    notes,
    fiscalTasks,
    rentaChecks,
    createdAt: d.createdAt || new Date().toISOString()
  };
}

export function loadData(): AppData {
  try {
    // 1. Try primary v2 key
    const v2 = localStorage.getItem(KEY_V2);
    if (v2) {
      const parsed = JSON.parse(v2);
      if (parsed && typeof parsed === 'object') return normalizeData(parsed);
    }

    // 2. Try v1 key
    const v1 = localStorage.getItem(KEY_V1);
    if (v1) {
      const parsed = JSON.parse(v1);
      if (parsed && typeof parsed === 'object') return normalizeData(parsed);
    }

    // 3. Try legacy key from original HTML
    const legacyPro = localStorage.getItem(KEY_LEGACY_PRO) || localStorage.getItem(KEY_LEGACY);
    if (legacyPro) {
      const parsed = JSON.parse(legacyPro);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const base = initialData();
        base.products = normalizeData({ products: parsed, sales: [], notes: [] }).products;
        return base;
      }
    }
  } catch (err) {
    console.error('Error loading data from storage:', err);
  }

  return initialData();
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(data));
    // Also save in legacy keys for seamless backwards-compatibility
    localStorage.setItem(KEY_LEGACY_PRO, JSON.stringify(data.products));
    localStorage.setItem(KEY_LEGACY, JSON.stringify(data.products));
    return true;
  } catch (err) {
    console.error('Error saving data to storage:', err);
    return false;
  }
}

export function productLabel(p: Product): string {
  return p.name + (p.size ? ' · ' + p.size : '') + (p.color ? ' · ' + p.color : '');
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportBackup(data: AppData) {
  const backup = {
    application: 'MIRANDA’S Closets+',
    schema: 2,
    exportedAt: new Date().toISOString(),
    data
  };
  downloadFile('mirandas-closets-copia-' + isoToday() + '.json', JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
}

function csvCell(v: any): string {
  let s = String(v ?? '');
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function exportCsvRows(filename: string, headers: string[], rows: any[][]) {
  const content = '\ufeff' + [headers, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
  downloadFile(filename, content, 'text/csv;charset=utf-8');
}

export function exportCSV(type: 'inventory' | 'sales' | 'purchases' | 'expenses' | 'tasks', data: AppData) {
  if (type === 'inventory') {
    exportCsvRows('mirandas-inventario.csv', 
      ['ID', 'Producto', 'Categoría', 'Talla', 'Color', 'Precio venta final EUR', 'Coste unitario EUR', 'Stock', 'Canal', 'Perchero'],
      data.products.map(p => [p.id, p.name, p.category, p.size, p.color, p.price, p.unitCost, p.stock, p.channel || '', p.rackLocation || ''])
    );
  } else if (type === 'sales') {
    exportCsvRows('mirandas-ventas.csv',
      ['ID venta', 'Fecha', 'Producto', 'Categoría', 'Talla', 'Color', 'Cantidad', 'Precio unidad EUR', 'Total línea EUR', 'Coste línea EUR', 'Método pago', 'Nota', 'Total ticket EUR'],
      data.sales.flatMap(s => (s.items || []).map(l => [
        s.id, s.date, l.name, l.category || '', l.size || '', l.color || '', l.quantity, l.price, l.total ?? l.quantity * l.price, l.costTotal ?? l.quantity * (l.unitCost || 0), s.payment, s.comment, s.total
      ]))
    );
  } else if (type === 'purchases') {
    exportCsvRows('mirandas-compras-facturas.csv',
      ['ID registro', 'Fecha', 'Proveedor', 'N.º factura', 'Base EUR', 'IVA anotado EUR', 'Recargo anotado EUR', 'Otros EUR', 'Total factura EUR', 'Líneas mercancía', 'Notas'],
      data.purchases.map(p => [p.id, p.date, p.supplier, p.invoice, p.base, p.iva, p.recargo, p.other, p.total, (p.lines || []).map(l => `${l.name} x${l.quantity} @${l.unitCost}`).join(' | '), p.notes])
    );
  } else if (type === 'expenses') {
    exportCsvRows('mirandas-gastos.csv',
      ['ID', 'Fecha', 'Categoría', 'Proveedor/destinatario', 'Factura/recibo', 'Descripción', 'Importe total EUR', 'IVA anotado EUR'],
      data.expenses.map(p => [p.id, p.date, p.category, p.supplier, p.invoice, p.description, p.amount, p.iva])
    );
  } else if (type === 'tasks') {
    exportCsvRows('mirandas-tareas-recordatorios.csv',
      ['Tipo', 'ID', 'Texto', 'Fecha', 'Categoría/modelo', 'Completado'],
      [
        ...data.notes.map(n => ['Recordatorio', n.id, n.text, n.dueDate, n.category, n.completed ? 'Sí' : 'No']),
        ...data.fiscalTasks.map(n => ['Fiscalidad', n.id, n.text, n.dueDate, n.model, n.completed ? 'Sí' : 'No'])
      ]
    );
  }
}
