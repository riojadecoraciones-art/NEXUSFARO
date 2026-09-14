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

/**
 * Lee un CSV "real" — no sólo el que exportamos nosotros mismos, sino el
 * que un cliente nuevo trae de Excel, Google Sheets, o el sistema que
 * usaba antes. Por eso:
 * - Detecta el delimitador (',' o ';') contando cuál aparece más en la
 *   primera línea, en vez de asumir uno fijo.
 * - Entiende campos entre comillas, incluidos los que tienen el
 *   delimitador o un salto de línea adentro (ej. una descripción larga).
 * - Saca el BOM UTF-8 si el archivo lo trae (lo agregamos nosotros mismos
 *   en buildCsv() para que Excel-AR lo abra bien).
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const bomless = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  // Normalizar los finales de línea ANTES de parsear evita tener que
  // distinguir \r suelto de \r\n carácter por carácter más abajo — un \r
  // o \n dentro de un campo entre comillas se preserva igual, porque ese
  // caso nunca pasa por acá (se agrega directo al campo en el bloque
  // `inQuotes`).
  const withoutBom = bomless.replace(/\r\n|\r/g, '\n');

  const firstLine = withoutBom.split('\n', 1)[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolons > commas ? ';' : ',';

  const allRows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    allRows.push(row);
    row = [];
  };

  for (let i = 0; i < withoutBom.length; i++) {
    const char = withoutBom[i];

    if (inQuotes) {
      if (char === '"') {
        if (withoutBom[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    // Una comilla sólo abre un campo entre comillas si aparece justo al
    // principio del campo — un '"' en el medio (ej. 24" de una medida, o
    // un nombre con comillas sueltas sin escapar "bien") se guarda tal
    // cual en vez de comerse el resto del campo. Un CSV real de un
    // cliente no siempre viene perfecto según la norma.
    if (char === '"' && field === '') {
      inQuotes = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else {
      field += char;
    }
  }

  // Última fila si el archivo no termina con salto de línea
  if (field !== '' || row.length > 0) {
    pushRow();
  }

  const nonEmptyRows = allRows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  const [headers, ...dataRows] = nonEmptyRows;

  return { headers: (headers || []).map((h) => h.trim()), rows: dataRows };
}

/**
 * Interpreta un número tal como puede venir en un archivo de un cliente:
 * "1500,50" (coma decimal, como usamos acá), "1500.50" (punto decimal),
 * "1.500,50" o "1,500.50" (con separador de miles). No hay forma de saber
 * el origen del archivo, así que la regla es: si aparecen los dos
 * símbolos, el que aparece último es el separador decimal; si aparece uno
 * solo, ese es el decimal (nunca se asume separador de miles solo).
 * Devuelve null si no se puede interpretar como número.
 */
export function parseFlexibleNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/[^0-9.,-]/g, '');
  if (!trimmed) return null;

  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');

  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    normalized =
      lastComma > lastDot
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed.replace(/,/g, '');
  } else if (lastComma !== -1) {
    normalized = trimmed.replace(',', '.');
  } else {
    normalized = trimmed;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
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
