import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppData, Product, Sale, Purchase, Expense, FiscalTask, Note } from '../types/inventory';
import { money, cents } from './storage';

// Common Palette for Miranda's Closets+
const plum = [72, 36, 95] as const;         // #48245f
const lavender = [112, 65, 154] as const;   // #70419a
const rose = [195, 75, 99] as const;        // #c34b63
const darkGray = [52, 40, 60] as const;     // #34283c
const mutedGray = [131, 118, 138] as const; // #83768a
const softBg = [251, 249, 253] as const;    // #fbf9fd

function drawBoutiqueHeader(doc: jsPDF, title: string, subtitle: string, reportName: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(plum[0], plum[1], plum[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Accent Rose Gold line
  doc.setFillColor(rose[0], rose[1], rose[2]);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 11);

  // Brand Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(234, 223, 240);
  doc.text(subtitle, 14, 18);

  // Document Title & Date (Right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(reportName, pageWidth - 14, 11, { align: 'right' });

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }) + ' · ' + now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(234, 223, 240);
  doc.text(`Generado: ${dateFormatted}`, pageWidth - 14, 18, { align: 'right' });
}

function drawPageFooter(doc: jsPDF, generatedBy?: string) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageNumber = (doc as any).internal.getCurrentPageInfo 
    ? (doc as any).internal.getCurrentPageInfo().pageNumber 
    : (doc as any).internal.getNumberOfPages();
  const totalPages = (doc as any).internal.getNumberOfPages();

  doc.setDrawColor(234, 223, 240);
  doc.setLineWidth(0.3);
  doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  
  const userText = generatedBy ? ` · Solicitado por: ${generatedBy}` : '';
  doc.text(
    `Miranda's Closets+ · Sevilla · Documento interno y confidencial${userText}`,
    14,
    pageHeight - 6
  );

  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    pageWidth - 14,
    pageHeight - 6,
    { align: 'right' }
  );
}

function drawKpiCards(
  doc: jsPDF,
  kpis: { title: string; value: string; subtitle: string; isAlert?: boolean; isProfit?: boolean }[],
  startY = 32
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const count = kpis.length;
  const gap = 4;
  const availableWidth = pageWidth - 28 - ((count - 1) * gap);
  const cardWidth = availableWidth / count;
  const cardHeight = 17;

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + gap);
    doc.setFillColor(softBg[0], softBg[1], softBg[2]);
    doc.setDrawColor(234, 223, 240);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    doc.text(kpi.title.toUpperCase(), x + 3, startY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    if (kpi.isProfit) {
      doc.setTextColor(35, 132, 93);
    } else if (kpi.isAlert) {
      doc.setTextColor(rose[0], rose[1], rose[2]);
    } else {
      doc.setTextColor(plum[0], plum[1], plum[2]);
    }
    doc.text(kpi.value, x + 3, startY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    doc.text(kpi.subtitle, x + 3, startY + 15);
  });

  return startY + cardHeight + 6;
}

// ==========================================
// 1. INFORME DE INVENTARIO
// ==========================================
export function generateInventoryPDF(data: AppData, generatedBy?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawBoutiqueHeader(
    doc,
    "MIRANDA'S CLOSETS+ · SEVILLA",
    "Gestión Privada de Tienda & Moda Curvy/Plus Size · TikTok Shop, Live & WhatsApp",
    "INFORME OFICIAL DE INVENTARIO"
  );

  const totalVariants = data.products.length;
  const totalUnits = data.products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalRetailValue = data.products.reduce((acc, p) => acc + (cents(p.price) * (Number(p.stock) || 0)), 0);
  const totalCostValue = data.products.reduce((acc, p) => acc + (cents(p.unitCost || 0) * (Number(p.stock) || 0)), 0);
  const potentialProfit = totalRetailValue - totalCostValue;
  const outOfStockCount = data.products.filter(p => (Number(p.stock) || 0) === 0).length;
  const lowStockCount = data.products.filter(p => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= 2).length;

  const tableTop = drawKpiCards(doc, [
    { title: 'Variantes', value: `${totalVariants}`, subtitle: 'referencias registradas' },
    { title: 'Stock Total', value: `${totalUnits} uds.`, subtitle: 'prendas en tienda' },
    { title: 'Inversión Coste', value: money(totalCostValue), subtitle: 'coste de compra' },
    { title: 'Valor en Venta', value: money(totalRetailValue), subtitle: 'precio PVP total' },
    { title: 'Beneficio Estimado', value: money(potentialProfit), subtitle: 'margen bruto potencial', isProfit: true },
    { title: 'Agotados / Alertas', value: `${outOfStockCount} / ${lowStockCount}`, subtitle: 'agotadas / stock bajo', isAlert: outOfStockCount > 0 }
  ]);

  const tableRows = data.products.map(p => {
    const stockNum = Number(p.stock) || 0;
    const itemRetail = (cents(p.price) * stockNum);
    let stockStatus = 'Óptimo';
    if (stockNum === 0) stockStatus = 'AGOTADO';
    else if (stockNum <= 2) stockStatus = 'BAJO';

    return [
      (p.sku || p.id.slice(-6)).toUpperCase(),
      p.name || 'Sin nombre',
      p.category || 'Ropa',
      p.size || '-',
      p.color || '-',
      p.channel || 'TikTok & WhatsApp',
      p.rackLocation || '-',
      p.unitCost ? `${money(p.unitCost)} (${money(p.unitCost * 1.262)})` : money(0),
      money(p.price),
      `${stockNum}`,
      stockStatus,
      money(itemRetail)
    ];
  });

  autoTable(doc, {
    startY: tableTop,
    margin: { left: 14, right: 14, bottom: 16 },
    head: [[
      'Cód.',
      'Prenda / Producto',
      'Categoría',
      'Talla',
      'Color',
      'Canal',
      'Perchero',
      'Coste/ud (+IVA+RE)',
      'PVP Final',
      'Stock',
      'Estado',
      'Total PVP'
    ]],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [72, 36, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      textColor: [52, 40, 60],
      lineColor: [240, 234, 244],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 253]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { cellWidth: 26 },
      3: { halign: 'center', cellWidth: 16 },
      4: { cellWidth: 20 },
      5: { cellWidth: 32 },
      6: { cellWidth: 22 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 18 },
      9: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      10: { halign: 'center', cellWidth: 18 },
      11: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 10) {
        const text = hookData.cell.raw;
        if (text === 'AGOTADO') {
          hookData.cell.styles.textColor = [195, 75, 99];
          hookData.cell.styles.fontStyle = 'bold';
        } else if (text === 'BAJO') {
          hookData.cell.styles.textColor = [180, 110, 20];
          hookData.cell.styles.fontStyle = 'bold';
        } else {
          hookData.cell.styles.textColor = [35, 132, 93];
        }
      }
    },
    didDrawPage: () => drawPageFooter(doc, generatedBy)
  });

  const now = new Date();
  doc.save(`Inventario_Mirandas_Closets_Plus_${now.toISOString().slice(0, 10)}.pdf`);
}

// ==========================================
// 2. INFORME DE VENTAS Y PEDIDOS
// ==========================================
export function generateSalesPDF(data: AppData, generatedBy?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawBoutiqueHeader(
    doc,
    "MIRANDA'S CLOSETS+ · SEVILLA",
    "Gestión de Ventas, Pedidos y Cobros · TikTok Shop, TikTok Live & WhatsApp",
    "INFORME OFICIAL DE VENTAS Y PEDIDOS"
  );

  const totalSales = data.sales.length;
  const totalRevenue = data.sales.reduce((acc, s) => acc + cents(s.total), 0);
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const totalItemsSold = data.sales.reduce((acc, s) => {
    return acc + (s.items || []).reduce((subAcc, it) => subAcc + (Number(it.quantity) || 1), 0);
  }, 0);

  // Group by payment method
  const paymentCounts: { [method: string]: number } = {};
  data.sales.forEach(s => {
    const pay = s.payment || 'Otro';
    paymentCounts[pay] = (paymentCounts[pay] || 0) + 1;
  });
  const topPayment = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bizum';

  const tableTop = drawKpiCards(doc, [
    { title: 'Total Ventas', value: `${totalSales} pedidos`, subtitle: 'tickets registrados' },
    { title: 'Facturación Total', value: money(totalRevenue), subtitle: 'ingresos brutos', isProfit: true },
    { title: 'Ticket Medio', value: money(avgTicket), subtitle: 'promedio por pedido' },
    { title: 'Prendas Vendidas', value: `${totalItemsSold} uds.`, subtitle: 'unidades entregadas' },
    { title: 'Cobro Frecuente', value: topPayment, subtitle: 'método más utilizado' },
    { title: 'Canales Activos', value: 'TikTok + WhatsApp', subtitle: 'multicanal sincronizado' }
  ]);

  const tableRows = data.sales.map(s => {
    const itemsDescription = (s.items || [])
      .map(it => `${it.quantity || 1}x ${it.name}${it.size ? ` (${it.size})` : ''}`)
      .join(', ') || 'Venta directa';

    return [
      s.id.slice(-6).toUpperCase(),
      s.date ? s.date.replace('T', ' ').slice(0, 16) : '-',
      s.payment || 'Bizum',
      itemsDescription,
      s.comment || '-',
      money(s.total)
    ];
  });

  autoTable(doc, {
    startY: tableTop,
    margin: { left: 14, right: 14, bottom: 16 },
    head: [[
      'Ticket',
      'Fecha / Hora',
      'Método de Cobro',
      'Prendas y Artículos Vendidos',
      'Comentario / Cliente',
      'Importe Total'
    ]],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [72, 36, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      textColor: [52, 40, 60],
      lineColor: [240, 234, 244],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 253]
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      1: { cellWidth: 32 },
      2: { cellWidth: 30 },
      3: { cellWidth: 95 },
      4: { cellWidth: 60 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 32 }
    },
    didDrawPage: () => drawPageFooter(doc, generatedBy)
  });

  const now = new Date();
  doc.save(`Ventas_Mirandas_Closets_Plus_${now.toISOString().slice(0, 10)}.pdf`);
}

// ==========================================
// 3. INFORME DE COMPRAS Y FACTURAS
// ==========================================
export function generatePurchasesPDF(data: AppData, generatedBy?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawBoutiqueHeader(
    doc,
    "MIRANDA'S CLOSETS+ · SEVILLA",
    "Gestión de Compras de Mercancía y Facturas con Recargo de Equivalencia",
    "INFORME OFICIAL DE COMPRAS Y FACTURAS"
  );

  const totalPurchases = data.purchases.length;
  const totalBase = data.purchases.reduce((acc, p) => acc + cents(p.base), 0);
  const totalIva = data.purchases.reduce((acc, p) => acc + cents(p.iva), 0);
  const totalRecargo = data.purchases.reduce((acc, p) => acc + cents(p.recargo), 0);
  const totalOther = data.purchases.reduce((acc, p) => acc + cents(p.other), 0);
  const grandTotal = data.purchases.reduce((acc, p) => acc + cents(p.total), 0);

  const tableTop = drawKpiCards(doc, [
    { title: 'Facturas Compras', value: `${totalPurchases}`, subtitle: 'facturas recibidas' },
    { title: 'Base Imponible', value: money(totalBase), subtitle: 'coste neto mercancía' },
    { title: 'IVA Soportado', value: money(totalIva), subtitle: 'impuesto directo 21%' },
    { title: 'Recargo Eq.', value: money(totalRecargo), subtitle: 'recargo de equivalencia' },
    { title: 'Otros Gastos', value: money(totalOther), subtitle: 'portes y aduanas' },
    { title: 'Inversión Total', value: money(grandTotal), subtitle: 'total facturado a pagar', isAlert: true }
  ]);

  const tableRows = data.purchases.map(p => {
    const linesDescription = (p.lines || [])
      .map(l => `${l.quantity}x ${l.name}`)
      .join(', ') || p.notes || 'Mercancía textil';

    return [
      p.invoice || p.id.slice(-6).toUpperCase(),
      p.supplier || 'Proveedor textil',
      p.date || '-',
      linesDescription,
      money(p.base),
      money(p.iva),
      money(p.recargo),
      money(p.other),
      money(p.total)
    ];
  });

  autoTable(doc, {
    startY: tableTop,
    margin: { left: 14, right: 14, bottom: 16 },
    head: [[
      'Factura Nº',
      'Proveedor',
      'Fecha',
      'Mercancía / Artículos',
      'Base Imp.',
      'IVA',
      'Recargo',
      'Otros',
      'Total Factura'
    ]],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [72, 36, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      textColor: [52, 40, 60],
      lineColor: [240, 234, 244],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 253]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      1: { cellWidth: 42 },
      2: { cellWidth: 22 },
      3: { cellWidth: 75 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 26 }
    },
    didDrawPage: () => drawPageFooter(doc, generatedBy)
  });

  const now = new Date();
  doc.save(`Compras_Mirandas_Closets_Plus_${now.toISOString().slice(0, 10)}.pdf`);
}

// ==========================================
// 4. INFORME DE GASTOS OPERATIVOS
// ==========================================
export function generateExpensesPDF(data: AppData, generatedBy?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawBoutiqueHeader(
    doc,
    "MIRANDA'S CLOSETS+ · SEVILLA",
    "Control de Gastos Operativos, Envíos, Embalajes y Gestión de Tienda",
    "INFORME OFICIAL DE GASTOS OPERATIVOS"
  );

  const totalCount = data.expenses.length;
  const totalAmount = data.expenses.reduce((acc, e) => acc + cents(e.amount), 0);
  const totalIva = data.expenses.reduce((acc, e) => acc + cents(e.iva || 0), 0);
  
  // Highest expense category
  const categoryTotals: { [cat: string]: number } = {};
  data.expenses.forEach(e => {
    const cat = e.category || 'Otros';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + cents(e.amount);
  });
  const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const topCategory = topCategoryEntry ? topCategoryEntry[0] : 'Envíos y embalaje';

  const tableTop = drawKpiCards(doc, [
    { title: 'Total Registros', value: `${totalCount} apuntes`, subtitle: 'gastos contabilizados' },
    { title: 'Gasto Total', value: money(totalAmount), subtitle: 'desembolso total', isAlert: true },
    { title: 'IVA Soportado', value: money(totalIva), subtitle: 'impuesto en facturas' },
    { title: 'Categoría Principal', value: topCategory, subtitle: 'mayor volumen de gasto' },
    { title: 'Impacto Envíos', value: money(categoryTotals['Envíos y embalaje'] || 0), subtitle: 'paquetería Correos/GLS' },
    { title: 'Deducciones', value: '100% justificado', subtitle: 'con factura / ticket' }
  ]);

  const tableRows = data.expenses.map(e => {
    return [
      e.id.slice(-6).toUpperCase(),
      e.date || '-',
      e.category || 'Otros',
      e.supplier || '-',
      e.invoice || '-',
      e.description || '-',
      money(e.iva || 0),
      money(e.amount)
    ];
  });

  autoTable(doc, {
    startY: tableTop,
    margin: { left: 14, right: 14, bottom: 16 },
    head: [[
      'Cód.',
      'Fecha',
      'Categoría de Gasto',
      'Proveedor / Acreedor',
      'Factura / Recibo',
      'Concepto / Descripción',
      'IVA Soport.',
      'Importe Total'
    ]],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [72, 36, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      textColor: [52, 40, 60],
      lineColor: [240, 234, 244],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [251, 249, 253]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 },
      1: { cellWidth: 22 },
      2: { cellWidth: 38 },
      3: { cellWidth: 42 },
      4: { cellWidth: 30 },
      5: { cellWidth: 70 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', fontStyle: 'bold', cellWidth: 29 }
    },
    didDrawPage: () => drawPageFooter(doc, generatedBy)
  });

  const now = new Date();
  doc.save(`Gastos_Mirandas_Closets_Plus_${now.toISOString().slice(0, 10)}.pdf`);
}

// ==========================================
// 5. INFORME DE TAREAS Y RECORDATORIOS
// ==========================================
export function generateTasksAndNotesPDF(data: AppData, generatedBy?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawBoutiqueHeader(
    doc,
    "MIRANDA'S CLOSETS+ · SEVILLA",
    "Calendario Fiscal, Modelos Tributarios y Recordatorios Operativos",
    "INFORME FISCAL Y RECORDATORIOS"
  );

  const pendingTasks = data.fiscalTasks.filter(t => !t.completed).length;
  const completedTasks = data.fiscalTasks.filter(t => t.completed).length;
  const pendingNotes = data.notes.filter(n => !n.completed).length;
  const completedNotes = data.notes.filter(n => n.completed).length;

  const tableTop = drawKpiCards(doc, [
    { title: 'Fiscales Pendientes', value: `${pendingTasks}`, subtitle: 'por presentar / revisar', isAlert: pendingTasks > 0 },
    { title: 'Fiscales Listas', value: `${completedTasks}`, subtitle: 'obligaciones cumplidas', isProfit: true },
    { title: 'Notas Pendientes', value: `${pendingNotes}`, subtitle: 'tareas operativas tienda' },
    { title: 'Notas Listas', value: `${completedNotes}`, subtitle: 'recordatorios resueltos' }
  ], 32);

  // Section 1: Fiscal Tasks
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(plum[0], plum[1], plum[2]);
  doc.text("1. Obligaciones y Tareas Fiscales (AEAT / Renta / Trimestrales)", 14, tableTop + 3);

  const taskRows = data.fiscalTasks.map(t => [
    t.completed ? 'COMPLETADA' : 'PENDIENTE',
    t.model || 'General',
    t.dueDate || '-',
    t.text || '-',
    t.system ? 'Oficial Sistema' : 'Manual'
  ]);

  autoTable(doc, {
    startY: tableTop + 6,
    margin: { left: 14, right: 14, bottom: 16 },
    head: [['Estado', 'Modelo / Régimen', 'Fecha Límite', 'Tarea / Obligación Fiscal', 'Origen']],
    body: taskRows,
    theme: 'plain',
    headStyles: {
      fillColor: [72, 36, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [52, 40, 60],
      lineColor: [240, 234, 244],
      lineWidth: 0.2
    },
    alternateRowStyles: { fillColor: [251, 249, 253] },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { cellWidth: 26 },
      3: { cellWidth: 70 },
      4: { halign: 'center', cellWidth: 28 }
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 0) {
        const isDone = hookData.cell.raw === 'COMPLETADA';
        hookData.cell.styles.textColor = isDone ? [35, 132, 93] : [195, 75, 99];
      }
    },
    didDrawPage: () => drawPageFooter(doc, generatedBy)
  });

  // Section 2: Notes
  const afterFiscalY = (doc as any).lastAutoTable?.finalY || 140;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(plum[0], plum[1], plum[2]);
  doc.text("2. Recordatorios y Notas de Tienda (Directos, Clientes, Logística)", 14, afterFiscalY + 10);

  const noteRows = data.notes.map(n => [
    n.completed ? 'COMPLETADA' : 'PENDIENTE',
    n.category || 'General',
    n.dueDate || '-',
    n.text || '-'
  ]);

  autoTable(doc, {
    startY: afterFiscalY + 13,
    margin: { left: 14, right: 14, bottom: 16 },
    head: [['Estado', 'Categoría', 'Fecha', 'Nota / Recordatorio']],
    body: noteRows,
    theme: 'plain',
    headStyles: {
      fillColor: [112, 65, 154],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [52, 40, 60],
      lineColor: [240, 234, 244],
      lineWidth: 0.2
    },
    alternateRowStyles: { fillColor: [251, 249, 253] },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
      1: { fontStyle: 'bold', cellWidth: 36 },
      2: { cellWidth: 28 },
      3: { cellWidth: 92 }
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 0) {
        const isDone = hookData.cell.raw === 'COMPLETADA';
        hookData.cell.styles.textColor = isDone ? [35, 132, 93] : [195, 75, 99];
      }
    },
    didDrawPage: () => drawPageFooter(doc, generatedBy)
  });

  const now = new Date();
  doc.save(`Fiscal_Recordatorios_Mirandas_${now.toISOString().slice(0, 10)}.pdf`);
}
