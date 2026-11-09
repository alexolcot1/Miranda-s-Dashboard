import { Product } from '../types/inventory';

export const INITIAL_DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'Conjunto Punto Otoño', category: 'Ropa', size: 'Curvy (44-52)', color: 'Camel / Beige', price: 29.99, unitCost: 12.00, stock: 2, channel: 'TikTok & WhatsApp', rackLocation: 'Perchero A1' },
  { id: '2', name: 'Vestido Midi Invitada', category: 'Ropa', size: 'Talla Única Plus', color: 'Frambuesa', price: 39.99, unitCost: 16.50, stock: 2, channel: 'TikTok & WhatsApp', rackLocation: 'Perchero A2' },
  { id: '3', name: 'Bolso Shopper Casual', category: 'Accesorios', size: 'Grande', color: 'Negro', price: 19.99, unitCost: 8.00, stock: 2, channel: 'TikTok & WhatsApp', rackLocation: 'Mostrador' }
];

export function cleanPrice(price: string | number | undefined): string {
  if (price === undefined || price === null) return '0.00 €';
  const str = String(price).trim();
  if (str.endsWith('€')) return str;
  const num = parseFloat(str.replace(',', '.'));
  if (isNaN(num)) return '0.00 €';
  return `${num.toFixed(2)} €`;
}

export function parsePriceToNumber(price: string | number | undefined): number {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  const cleaned = String(price).replace('€', '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Intelligent parser that extracts products from:
 * 1. Raw Gemini HTML output (e.g. `<script> let inventory = [...]`)
 * 2. Raw JSON array or object
 * 3. HTML table rows (`<tr><td>...</td></tr>`)
 * 4. CSV lines
 */
export function parseImportData(rawInput: string): { success: boolean; products: Product[]; message: string } {
  if (!rawInput || !rawInput.trim()) {
    return { success: false, products: [], message: 'El texto introducido está vacío.' };
  }

  const clean = rawInput.trim();

  // 1. Try finding `inventory = [...]` inside JS code / script tags
  const scriptRegex = /inventory\s*=\s*(?:JSON\.parse\(localStorage\.getItem\([^)]+\)\)\s*\|\|\s*)?(\[[^;]+\])/i;
  const scriptMatch = clean.match(scriptRegex);
  if (scriptMatch && scriptMatch[1]) {
    try {
      // Evaluate or parse JSON
      const jsonCandidate = scriptMatch[1].trim();
      // Handle relaxed JS object literals (keys without quotes)
      const sanitized = jsonCandidate
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"');
      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          success: true,
          products: normalizeProductList(parsed),
          message: `¡Éxito! Se han extraído ${parsed.length} prendas del script original de Gemini.`
        };
      }
    } catch {
      // Fall through to other extraction methods
    }
  }

  // 2. Direct JSON parsing
  try {
    // If it's wrapped in markdown ```json ... ``` or ```html ... ```
    const codeBlockMatch = clean.match(/```(?:json|html|javascript)?\s*([\s\S]*?)\s*```/i);
    const textToTest = codeBlockMatch ? codeBlockMatch[1] : clean;

    const parsed = JSON.parse(textToTest);
    if (Array.isArray(parsed)) {
      return {
        success: true,
        products: normalizeProductList(parsed),
        message: `¡Éxito! Se han restaurado ${parsed.length} prendas en formato JSON.`
      };
    } else if (parsed && Array.isArray(parsed.products)) {
      return {
        success: true,
        products: normalizeProductList(parsed.products),
        message: `¡Éxito! Se han restaurado ${parsed.products.length} prendas desde el archivo de respaldo.`
      };
    }
  } catch {
    // Not direct JSON
  }

  // 3. Fallback search for any array of objects inside the text [ { ... } ]
  const arrayMatches = clean.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
  if (arrayMatches) {
    for (const match of arrayMatches) {
      try {
        const sanitized = match
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
          .replace(/'/g, '"');
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          return {
            success: true,
            products: normalizeProductList(parsed),
            message: `¡Éxito! Se encontraron y extrajeron ${parsed.length} prendas.`
          };
        }
      } catch {
        continue;
      }
    }
  }

  // 4. Try HTML table parsing if it contains <tr> or <td>
  if (clean.includes('<tr') || clean.includes('<td')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(clean, 'text/html');
      const rows = doc.querySelectorAll('tr');
      const extracted: Product[] = [];

      rows.forEach((row, idx) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const name = cells[0]?.textContent?.trim() || `Prenda #${idx + 1}`;
          const channel = cells[1]?.textContent?.trim() || 'TikTok & WhatsApp';
          const stockText = cells[2]?.textContent?.replace(/\D/g, '') || '0';
          const priceText = cells[3]?.textContent?.trim() || '29.99 €';

          extracted.push({
            id: String(Date.now() + idx),
            name,
            category: 'Ropa',
            size: '',
            color: '',
            channel: channel || 'TikTok & WhatsApp',
            stock: parseInt(stockText, 10) || 0,
            price: parsePriceToNumber(priceText),
            unitCost: 0
          });
        }
      });

      if (extracted.length > 0) {
        return {
          success: true,
          products: extracted,
          message: `¡Éxito! Se recuperaron ${extracted.length} prendas desde las filas de la tabla HTML.`
        };
      }
    } catch {
      // DOM parsing failed
    }
  }

  // 5. Try CSV / Delimited lines parsing
  const lines = clean.split('\n').filter(l => l.trim().length > 0);
  if (lines.length > 1 && (lines[0].includes(',') || lines[0].includes(';'))) {
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const parsedCsv: Product[] = [];

    // Check if first line is header
    const startIndex = lines[0].toLowerCase().includes('prenda') || lines[0].toLowerCase().includes('nombre') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2 && parts[0]) {
        parsedCsv.push({
          id: String(Date.now() + i),
          name: parts[0],
          category: 'Ropa',
          size: '',
          color: '',
          channel: parts[1] || 'TikTok & WhatsApp',
          stock: parseInt(parts[2] || '1', 10) || 0,
          price: parsePriceToNumber(parts[3] || '25.00 €'),
          unitCost: 0
        });
      }
    }

    if (parsedCsv.length > 0) {
      return {
        success: true,
        products: parsedCsv,
        message: `¡Éxito! Se importaron ${parsedCsv.length} prendas desde archivo CSV.`
      };
    }
  }

  return {
    success: false,
    products: [],
    message: 'No se encontraron prendas reconocibles en el texto proporcionado. Asegúrate de pegar el código HTML que te dio Gemini o un archivo JSON válido.'
  };
}

function normalizeProductList(rawList: unknown[]): Product[] {
  return rawList.map((item: any, index: number) => {
    let price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price || item.precio || 0).replace('€', '').replace(',', '.'));
    if (isNaN(price)) price = 29.99;

    let unitCost = typeof item.unitCost === 'number' ? item.unitCost : (typeof item.cost === 'number' ? item.cost : parseFloat(String(item.cost || item.unitCost || 0).replace('€', '').replace(',', '.')));
    if (isNaN(unitCost)) unitCost = 0;

    return {
      id: String(item.id || Date.now() + index),
      name: String(item.name || item.prenda || item.articulo || `Prenda ${index + 1}`).trim(),
      category: item.category || item.categoria || 'Ropa',
      size: item.size || item.talla || '',
      color: item.color || '',
      price: Math.round(price * 100) / 100,
      unitCost: Math.round(unitCost * 100) / 100,
      stock: typeof item.stock === 'number' ? Math.max(0, item.stock) : parseInt(item.stock, 10) || 0,
      channel: item.channel || item.canal || 'TikTok & WhatsApp',
      rackLocation: item.rackLocation || item.perchero || `Perchero ${index + 1}`,
      notes: item.notes || item.notas || ''
    };
  });
}

