/**
 * Exportación de CSV pensada para abrirse con doble clic en Excel en español
 * (Argentina), no sólo para "ser un CSV válido".
 *
 * Dos detalles que rompen esto si se ignoran:
 * - Excel-AR usa ';' como separador de campo, porque ',' ya es el separador
 *   decimal en esa configuración regional. Un CSV separado por comas se abre
 *   como una sola columna ilegible.
 *   https://learn.microsoft.com/en-us/office/troubleshoot/excel/international-csv-text-file-issues
 * - Sin BOM UTF-8, Excel adivina la codificación y rompe los acentos (á, é,
 *   ñ) al abrir por doble clic.
 */

const DELIMITER = ';';

function escapeCsvField(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** '1234.5' -> '1234,50': coma decimal, sin separador de miles ni símbolo de
 * moneda, para que Excel reconozca la celda como número (y se pueda sumar),
 * no como texto. */
export function formatCsvNumber(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row
      .map((cell) => escapeCsvField(typeof cell === 'number' ? formatCsvNumber(cell) : String(cell)))
      .join(DELIMITER)
  );
  return '\ufeff' + lines.join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
