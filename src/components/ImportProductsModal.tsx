import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { parseCsv, parseFlexibleNumber, buildCsv, downloadCsv } from '../utils/csv';
import { formatARS } from '../utils/currency';
import { ProductImportRow, ProductUnitType, UNIT_TYPE_LABELS } from '../types';
import {
  X,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
} from 'lucide-react';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

type FieldKey =
  | 'sku'
  | 'name'
  | 'barcode'
  | 'category'
  | 'salePrice'
  | 'costPrice'
  | 'stock'
  | 'minStock'
  | 'description'
  | 'unitType';

type FieldMapping = Record<FieldKey, string | null>;

interface FieldConfig {
  key: FieldKey;
  label: string;
  required: boolean;
  guesses: string[];
}

const FIELD_CONFIGS: FieldConfig[] = [
  { key: 'sku', label: 'SKU / Código', required: true, guesses: ['sku', 'codigo', 'cod'] },
  { key: 'name', label: 'Nombre del Producto', required: true, guesses: ['nombre', 'producto', 'articulo'] },
  { key: 'barcode', label: 'Código de Barras', required: false, guesses: ['barra', 'ean', 'barcode'] },
  { key: 'category', label: 'Categoría', required: false, guesses: ['categoria', 'rubro', 'familia'] },
  { key: 'salePrice', label: 'Precio de Venta', required: true, guesses: ['ventapublico', 'preciopublico', 'pvp', 'precioventa', 'precio'] },
  { key: 'costPrice', label: 'Precio de Costo', required: false, guesses: ['preciocosto', 'costo', 'compra'] },
  { key: 'stock', label: 'Stock', required: false, guesses: ['stock', 'cantidad', 'existencia'] },
  { key: 'minStock', label: 'Stock Mínimo', required: false, guesses: ['stockminimo', 'minimo'] },
  { key: 'unitType', label: 'Se vende por (Unidad/Kg/Gramo/Litro/ml)', required: false, guesses: ['unidadmedida', 'unidadventa', 'tipounidad', 'unidad', 'medida'] },
  { key: 'description', label: 'Descripción', required: false, guesses: ['descripcion', 'detalle', 'observacion'] },
];

// Sinónimos comunes → el valor exacto que guarda la base. Se compara contra
// el texto de la CELDA (no del encabezado) ya normalizado, así que "Kg",
// "KILOS" o "kilogramo" caen todos en el mismo lugar.
const UNIT_TYPE_VALUE_MAP: Record<string, ProductUnitType> = {
  kg: 'KG', kilo: 'KG', kilos: 'KG', kilogramo: 'KG', kilogramos: 'KG',
  g: 'GRAMO', gr: 'GRAMO', grs: 'GRAMO', gramo: 'GRAMO', gramos: 'GRAMO',
  l: 'LITRO', lt: 'LITRO', lts: 'LITRO', litro: 'LITRO', litros: 'LITRO',
  ml: 'ML', mililitro: 'ML', mililitros: 'ML',
  u: 'UNIDAD', un: 'UNIDAD', und: 'UNIDAD', unidad: 'UNIDAD', unidades: 'UNIDAD',
};

function parseUnitTypeValue(raw: string): ProductUnitType {
  return UNIT_TYPE_VALUE_MAP[normalizeHeader(raw)] || 'UNIDAD';
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function guessMapping(headers: string[]): FieldMapping {
  const mapping = {} as FieldMapping;
  const used = new Set<string>();

  for (const field of FIELD_CONFIGS) {
    const match = headers.find((h) => {
      if (used.has(h)) return false;
      const normalized = normalizeHeader(h);
      return field.guesses.some((g) => normalized.includes(g));
    });
    mapping[field.key] = match || null;
    if (match) used.add(match);
  }

  return mapping;
}

interface ValidRow {
  rowNumber: number;
  data: ProductImportRow;
}

interface InvalidRow {
  rowNumber: number;
  reason: string;
}

function buildRows(
  headers: string[],
  rawRows: string[][],
  mapping: FieldMapping,
  autoGenerateSku: boolean
): { valid: ValidRow[]; invalid: InvalidRow[] } {
  const valid: ValidRow[] = [];
  const invalid: InvalidRow[] = [];
  const usedSkus = new Set<string>();
  let autoSkuCounter = 1;

  const get = (row: string[], headerName: string | null): string => {
    if (!headerName) return '';
    const idx = headers.indexOf(headerName);
    return idx === -1 ? '' : (row[idx] ?? '').trim();
  };

  rawRows.forEach((rawRow, i) => {
    const rowNumber = i + 1;
    const isBlankRow = rawRow.every((c) => !c || !c.trim());
    if (isBlankRow) return;

    const name = get(rawRow, mapping.name);
    if (!name) {
      invalid.push({ rowNumber, reason: 'Falta el nombre del producto' });
      return;
    }

    let sku = get(rawRow, mapping.sku);
    if (!sku) {
      if (!autoGenerateSku) {
        invalid.push({ rowNumber, reason: 'Falta el SKU (o activá "generar automático")' });
        return;
      }
      do {
        sku = `SKU-${String(autoSkuCounter).padStart(6, '0')}`;
        autoSkuCounter++;
      } while (usedSkus.has(sku));
    }
    usedSkus.add(sku);

    const salePriceRaw = get(rawRow, mapping.salePrice);
    const salePrice = parseFlexibleNumber(salePriceRaw);
    if (salePrice === null || salePrice < 0) {
      invalid.push({ rowNumber, reason: `Precio de venta inválido: "${salePriceRaw || '(vacío)'}"` });
      return;
    }

    const costPrice = parseFlexibleNumber(get(rawRow, mapping.costPrice)) ?? 0;
    const stock = parseFlexibleNumber(get(rawRow, mapping.stock)) ?? 0;
    const minStock = parseFlexibleNumber(get(rawRow, mapping.minStock)) ?? 5;
    const unitType = mapping.unitType ? parseUnitTypeValue(get(rawRow, mapping.unitType)) : 'UNIDAD';

    valid.push({
      rowNumber,
      data: {
        name,
        sku,
        barcode: get(rawRow, mapping.barcode) || undefined,
        category: get(rawRow, mapping.category) || 'General',
        salePrice,
        costPrice,
        stock,
        minStock,
        unitType,
        description: get(rawRow, mapping.description) || undefined,
      },
    });
  });

  return { valid, invalid };
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({ isOpen, onClose }) => {
  const { importProducts } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({} as FieldMapping);
  const [autoGenerateSku, setAutoGenerateSku] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [result, setResult] = useState<{ importedCount: number; failedCount: number } | null>(null);

  const { valid: validRows, invalid: invalidRows } = useMemo(() => {
    if (step !== 'preview' && step !== 'importing' && step !== 'done') return { valid: [], invalid: [] };
    return buildRows(headers, rawRows, mapping, autoGenerateSku);
  }, [step, headers, rawRows, mapping, autoGenerateSku]);

  if (!isOpen) return null;

  const resetAll = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setMapping({} as FieldMapping);
    setAutoGenerateSku(false);
    setParseError(null);
    setProgress({ done: 0, total: 0 });
    setResult(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleFileSelected = async (file: File) => {
    setParseError(null);
    try {
      const text = await file.text();
      const { headers: parsedHeaders, rows } = parseCsv(text);

      if (parsedHeaders.length === 0 || rows.length === 0) {
        setParseError('El archivo está vacío o no se pudo leer como CSV.');
        return;
      }

      setFileName(file.name);
      setHeaders(parsedHeaders);
      setRawRows(rows);
      setMapping(guessMapping(parsedHeaders));
      setStep('mapping');
    } catch (e) {
      console.error('Error reading import file:', e);
      setParseError('No se pudo leer el archivo. Verificá que sea un CSV válido.');
    }
  };

  const handleDownloadTemplate = () => {
    const csv = buildCsv(
      ['Nombre', 'SKU', 'Codigo de Barras', 'Categoria', 'Precio de Venta', 'Precio de Costo', 'Stock', 'Stock Minimo', 'Unidad de Venta', 'Descripcion'],
      [
        ['Aceite de Oliva 500ml', 'ACE-001', '7791234567890', 'Almacén', 2500, 1500, 20, 5, 'Unidad', ''],
        ['Almendras sueltas', 'ALM-001', '', 'Almacén', 4500, 3000, 5, 1, 'Kg', ''],
      ]
    );
    downloadCsv('plantilla-productos.csv', csv);
  };

  const canProceedFromMapping = Boolean(mapping.name) && Boolean(mapping.salePrice) && (Boolean(mapping.sku) || autoGenerateSku);

  const handleConfirmImport = async () => {
    setStep('importing');
    const res = await importProducts(
      validRows.map((r) => r.data),
      (done, total) => setProgress({ done, total })
    );
    setResult({
      importedCount: res.importedCount,
      failedCount: validRows.length - res.importedCount,
    });
    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Importar Productos</h2>
              <span className="text-xs text-slate-500 font-medium">Carga masiva desde un archivo CSV</span>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
              >
                <Upload className="w-10 h-10 text-slate-400" />
                <div className="text-center">
                  <p className="font-bold text-slate-800 text-sm">Hacé clic para elegir un archivo CSV</p>
                  <p className="text-xs text-slate-500 mt-1">Exportado desde Excel, Google Sheets, o tu sistema anterior</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar plantilla de ejemplo</span>
              </button>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-500">
                Archivo <strong className="text-slate-800">{fileName}</strong> — {rawRows.length} filas detectadas.
                Elegí qué columna de tu archivo corresponde a cada dato.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIELD_CONFIGS.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    {field.key === 'sku' && autoGenerateSku ? (
                      <div className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-medium text-slate-400">
                        Se genera automático
                      </div>
                    ) : (
                      <select
                        value={mapping[field.key] || ''}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [field.key]: e.target.value || null }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">— No usar —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.key === 'sku' && (
                      <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoGenerateSku}
                          onChange={(e) => setAutoGenerateSku(e.target.checked)}
                          className="rounded"
                        />
                        <span>Mi archivo no tiene SKU — generar uno automático</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview of first raw rows */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="py-2 px-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawRows.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="py-2 px-3 text-slate-600 whitespace-nowrap max-w-[160px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW / VALIDATE */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-2xl font-black text-emerald-900">{validRows.length}</div>
                    <div className="text-[11px] font-bold text-emerald-700">Listas para importar</div>
                  </div>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                  <div>
                    <div className="text-2xl font-black text-rose-900">{invalidRows.length}</div>
                    <div className="text-[11px] font-bold text-rose-700">Con error (no se importan)</div>
                  </div>
                </div>
              </div>

              {invalidRows.length > 0 && (
                <div className="border border-rose-200 rounded-xl max-h-32 overflow-y-auto">
                  <div className="divide-y divide-rose-100">
                    {invalidRows.slice(0, 20).map((r) => (
                      <div key={r.rowNumber} className="px-3 py-1.5 text-[11px] text-rose-700">
                        Fila {r.rowNumber}: {r.reason}
                      </div>
                    ))}
                  </div>
                  {invalidRows.length > 20 && (
                    <div className="px-3 py-1.5 text-[11px] text-rose-500 font-semibold">
                      + {invalidRows.length - 20} más...
                    </div>
                  )}
                </div>
              )}

              {validRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                      <tr>
                        <th className="py-2 px-3">Nombre</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Categoría</th>
                        <th className="py-2 px-3 text-right">Precio Venta</th>
                        <th className="py-2 px-3 text-right">Stock</th>
                        <th className="py-2 px-3">Unidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validRows.slice(0, 8).map((r) => (
                        <tr key={r.rowNumber}>
                          <td className="py-2 px-3 font-semibold text-slate-800 max-w-[180px] truncate">{r.data.name}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{r.data.sku}</td>
                          <td className="py-2 px-3 text-slate-600">{r.data.category}</td>
                          <td className="py-2 px-3 text-right text-slate-800">{formatARS(r.data.salePrice)}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{r.data.stock}</td>
                          <td className="py-2 px-3 text-slate-600">{UNIT_TYPE_LABELS[r.data.unitType]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 8 && (
                    <div className="px-3 py-2 text-[11px] text-slate-400 font-semibold border-t border-slate-100">
                      + {validRows.length - 8} más...
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Si un SKU ya existe en tu inventario, se actualiza (precio, stock, etc.) en vez de duplicarse.
              </p>
            </div>
          )}

          {/* STEP 4: IMPORTING */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm">Importando productos…</p>
                <p className="text-xs text-slate-500 mt-1">
                  {progress.total > 0 ? `${progress.done} / ${progress.total}` : 'Preparando…'}
                </p>
              </div>
              {progress.total > 0 && (
                <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 5: DONE */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-600" />
              <div>
                <p className="font-bold text-slate-900 text-lg">Importación terminada</p>
                <p className="text-sm text-slate-600 mt-1">
                  {result.importedCount} productos importados con éxito
                  {result.failedCount > 0 && `, ${result.failedCount} con error al guardar`}
                  {invalidRows.length > 0 && ` (${invalidRows.length} filas del archivo se saltearon por datos inválidos)`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          {step === 'mapping' ? (
            <button
              onClick={() => setStep('upload')}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>
          ) : (
            <span />
          )}

          {step === 'mapping' && (
            <button
              disabled={!canProceedFromMapping}
              onClick={() => setStep('preview')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <span>Continuar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 'preview' && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setStep('mapping')}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
              <button
                disabled={validRows.length === 0}
                onClick={handleConfirmImport}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                <span>Importar {validRows.length} productos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {step === 'done' && (
            <button
              onClick={handleClose}
              className="ml-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
