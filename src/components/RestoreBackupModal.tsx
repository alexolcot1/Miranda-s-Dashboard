import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  Download, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  FileJson, 
  Copy, 
  Check, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { AppData, Product } from '../types/inventory';
import { parseImportData, INITIAL_DEFAULT_PRODUCTS } from '../utils/parser';
import { exportBackup, exportCSV, money } from '../utils/storage';

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onRestoreProducts: (newProducts: Product[], mode: 'replace' | 'merge') => void;
  onRestoreFullBackup: (incomingData: AppData) => void;
  onResetToDefault: () => void;
}

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  isOpen,
  onClose,
  appData,
  onRestoreProducts,
  onRestoreFullBackup,
  onResetToDefault
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file' | 'export' | 'reset'>('paste');
  const [pastedCode, setPastedCode] = useState('');
  const [previewProducts, setPreviewProducts] = useState<Product[] | null>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [copiedJson, setCopiedJson] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleAnalyzePasted = () => {
    if (!pastedCode.trim()) {
      setImportStatus({ success: false, message: 'Por favor pega el código o texto que te devolvió Gemini.' });
      return;
    }

    const result = parseImportData(pastedCode);
    setImportStatus({ success: result.success, message: result.message });
    if (result.success) {
      setPreviewProducts(result.products);
    } else {
      setPreviewProducts(null);
    }
  };

  const handleApplyRestore = () => {
    if (!previewProducts || previewProducts.length === 0) return;
    onRestoreProducts(previewProducts, restoreMode);
    setImportStatus({
      success: true,
      message: `¡Completado! Se han ${restoreMode === 'replace' ? 'reemplazado' : 'añadido'} ${previewProducts.length} prendas con éxito.`
    });
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setPastedCode(content);
        
        // Check if it's a full AppData JSON backup
        const parsed = JSON.parse(content);
        if (parsed && (parsed.application === 'MIRANDA’S Closets+' || parsed.schema || parsed.data?.products)) {
          const target = parsed.data || parsed;
          onRestoreFullBackup(target);
          setImportStatus({ success: true, message: `¡Copia de seguridad completa restaurada con éxito desde "${file.name}"!` });
          setTimeout(() => onClose(), 1500);
          return;
        }

        // Otherwise try general parser
        const result = parseImportData(content);
        setImportStatus({ success: result.success, message: `Archivo "${file.name}": ${result.message}` });
        if (result.success) {
          setPreviewProducts(result.products);
        }
      } catch {
        const result = parseImportData(event.target?.result as string);
        setImportStatus({ success: result.success, message: `Archivo: ${result.message}` });
        if (result.success) {
          setPreviewProducts(result.products);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleCopyCurrentJson = () => {
    const data = JSON.stringify(appData, null, 2);
    navigator.clipboard.writeText(data);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-[#eadff0] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#70419a] to-[#48245f] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl">
                Restauración & Copias de Seguridad
              </h3>
              <p className="text-xs text-[#eadff0]">
                Recupera tu catálogo desde el código de Gemini, archivos JSON o CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-[#f5effa]/60 px-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'paste'
                ? 'border-[#70419a] text-[#70419a] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4 text-[#70419a]" />
            <span>Pegar Código Gemini / HTML</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'file'
                ? 'border-[#70419a] text-[#70419a] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Upload className="w-4 h-4 text-[#70419a]" />
            <span>Subir Archivo (.json / .csv)</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-[#70419a] text-[#70419a] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Download className="w-4 h-4 text-[#70419a]" />
            <span>Descargar Copia de Respaldo</span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'reset'
                ? 'border-[#70419a] text-[#70419a] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-amber-500" />
            <span>Restaurar Catálogo Base</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* TAB 1: PEGAR CÓDIGO GEMINI */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="info-purple">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-[#70419a]" />
                  ¿Gemini te devolvió un bloque de código HTML como texto?
                </p>
                <p className="leading-relaxed">
                  Pega aquí todo el texto que te dio Gemini (desde <code>&lt;!DOCTYPE html&gt;</code> hasta el final o cualquier lista de prendas). Nuestro analizador inteligente detectará automáticamente todas tus prendas, precios y existencias para restaurarlas en tu pantalla.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Pega el código HTML, JSON o texto aquí:
                </label>
                <textarea
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  placeholder="Pega aquí el código HTML de Gemini o JSON de prendas..."
                  rows={7}
                  className="w-full p-3 text-xs font-mono rounded-xl border border-[#eadff0] focus:border-[#70419a] focus:ring-2 focus:ring-[#f5effa] outline-none bg-gray-50/70"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={handleAnalyzePasted}
                  className="px-5 py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Analizar y Extraer Prendas</span>
                </button>

                {pastedCode && (
                  <button
                    onClick={() => {
                      setPastedCode('');
                      setPreviewProducts(null);
                      setImportStatus(null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    Limpiar campo
                  </button>
                )}
              </div>

              {/* Status message */}
              {importStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                    importStatus.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {importStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>{importStatus.message}</div>
                </div>
              )}

              {/* Preview extracted products */}
              {previewProducts && previewProducts.length > 0 && (
                <div className="mt-4 border border-[#eadff0] rounded-xl p-4 bg-[#f5effa]/40">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#48245f]">
                      Vista Previa ({previewProducts.length} prendas listas para restaurar)
                    </h4>
                    <div className="flex items-center gap-2 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="accent-[#70419a]"
                        />
                        <span className="font-semibold text-gray-700">Reemplazar actual</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer ml-2">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="accent-[#70419a]"
                        />
                        <span className="font-semibold text-gray-700">Combinar / Añadir</span>
                      </label>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-[#eadff0] bg-white rounded-lg border border-[#eadff0] p-2">
                    {previewProducts.map((p, i) => (
                      <div key={i} className="py-2 px-2 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-gray-800">{p.name}</strong>
                          <span className="text-gray-400 ml-2">({p.channel || 'Tienda'})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-[#f5effa] text-[#70419a] px-2 py-0.5 rounded font-bold">
                            {p.stock} uds
                          </span>
                          <span className="font-bold text-gray-700">{money(p.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleApplyRestore}
                    className="w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>Confirmar y Restaurar {previewProducts.length} Prendas en mi Inventario</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUBIR ARCHIVO */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                Selecciona una copia de seguridad en formato <code>.json</code> o un archivo <code>.csv</code> exportado previamente.
              </p>

              <div className="border-2 border-dashed border-[#eadff0] rounded-2xl p-8 text-center bg-[#f5effa]/30 hover:bg-[#f5effa]/60 transition-colors">
                <FileJson className="w-12 h-12 text-[#70419a] mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-700">Selecciona tu archivo de copia de seguridad</p>
                <p className="text-xs text-gray-500 mt-1">Formatos soportados: .json, .csv, .txt, .html</p>
                <label className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs cursor-pointer shadow-md transition-all">
                  <Upload className="w-4 h-4" />
                  <span>Explorar Archivos</span>
                  <input
                    type="file"
                    accept=".json,.csv,.txt,.html"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {importStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    importStatus.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  {importStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{importStatus.message}</span>
                </div>
              )}

              {previewProducts && (
                <button
                  onClick={handleApplyRestore}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Restaurar {previewProducts.length} Prendas desde el Archivo</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: EXPORTAR COPIA DE SEGURIDAD */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                Guarda una copia de seguridad para que nunca vuelvas a perder los artículos de MIRANDA’S Closets+, incluso si limpias el navegador o cambias de dispositivo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* JSON Full Backup */}
                <div className="p-5 rounded-2xl border border-[#eadff0] bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-[#f5effa] text-[#70419a]">
                      <FileJson className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Copia Completa JSON</h4>
                      <span className="text-[11px] text-gray-500">Incluye inventario, ventas, compras y notas</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    El archivo ideal para restaurar con un solo clic en cualquier tablet Xiaomi, móvil o PC.
                  </p>
                  <button
                    onClick={() => exportBackup(appData)}
                    className="mt-4 w-full py-2.5 px-3 rounded-xl bg-[#70419a] hover:bg-[#48245f] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Backup JSON</span>
                  </button>
                </div>

                {/* CSV for Excel */}
                <div className="p-5 rounded-2xl border border-[#eadff0] bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Hojas Excel / CSV</h4>
                      <span className="text-[11px] text-gray-500">Separado por punto y coma (;) para España</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5 text-xs">
                    <button
                      onClick={() => exportCSV('inventory', appData)}
                      className="w-full py-2 px-2.5 rounded-lg bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-left cursor-pointer transition-colors"
                    >
                      Exportar inventario (.csv)
                    </button>
                    <button
                      onClick={() => exportCSV('sales', appData)}
                      className="w-full py-2 px-2.5 rounded-lg bg-[#f5effa] hover:bg-[#eadff0] text-[#70419a] font-bold text-left cursor-pointer transition-colors"
                    >
                      Exportar ventas (.csv)
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Copy JSON */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-700">Copiar datos al portapapeles</span>
                  <p className="text-[11px] text-gray-500">Copia el texto JSON directamente para enviártelo por WhatsApp o guardarlo en notas</p>
                </div>
                <button
                  onClick={handleCopyCurrentJson}
                  className="px-3.5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: RESTAURAR CATÁLOGO BASE */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  ¿Quieres volver a los 3 productos originales del dashboard de Gemini?
                </p>
                <p className="leading-relaxed">
                  Esto repondrá exactamente las 3 prendas con las que empezó MIRANDA’S Closets+:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 font-medium">
                  {INITIAL_DEFAULT_PRODUCTS.map((p, idx) => (
                    <li key={idx}>
                      <strong>{p.name}</strong> • Stock: {p.stock} uds • {money(p.price)} ({p.channel || 'Tienda'})
                    </li>
                  ))}
                </ul>
              </div>

              {confirmReset ? (
                <div className="space-y-2 p-3 bg-amber-100/70 border border-amber-300 rounded-xl">
                  <p className="text-xs font-bold text-amber-950 text-center">
                    ¿Estás segura? Se repondrán las 3 prendas iniciales y se cerrará esta ventana.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onResetToDefault();
                        setConfirmReset(false);
                        onClose();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Sí, Restaurar Ahora</span>
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar los 3 Artículos Base de Gemini</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
