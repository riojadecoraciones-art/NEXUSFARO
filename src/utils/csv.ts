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
  // Un campo que arranca con =, +, -, @ o tab, Excel/Sheets lo puede
  // interpretar como fórmula al abrir el archivo — un nombre de cajero o
  // producto con ese contenido (cargado por cualquier empleado) podría
  // ejecutar algo en la PC de quien exporta el reporte. Anteponer un
  // apóstrofe neutraliza la fórmula sin cambiar el texto visible.
  // https://owasp.org/www-community/attacks/CSV_Injection
  const needsFormulaGuard = /^[=+\-@\t]/.test(value);
  const guarded = needsFormulaGuard ? `'${value}` : value;

  if (/[";\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
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
