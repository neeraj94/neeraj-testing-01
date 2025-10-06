export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'print';

export interface ExportColumn {
  key: string;
  header: string;
}

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

const textEncoder = new TextEncoder();

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const toArrayBuffer = (data: Uint8Array): ArrayBuffer =>
  data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

const toColumnLetter = (index: number) => {
  let dividend = index;
  let columnLabel = '';
  while (dividend > 0) {
    let modulo = (dividend - 1) % 26;
    columnLabel = String.fromCharCode(65 + modulo) + columnLabel;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnLabel || 'A';
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    const byte = data[i];
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const toDosTime = (date: Date) => {
  const seconds = Math.floor(date.getSeconds() / 2);
  return (date.getHours() << 11) | (date.getMinutes() << 5) | seconds;
};

const toDosDate = (date: Date) => {
  const year = date.getFullYear();
  const safeYear = Math.max(1980, Math.min(2107, year));
  return ((safeYear - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
};

type ZipEntry = {
  path: string;
  data: Uint8Array;
  date?: Date;
};

const createZip = (entries: ZipEntry[]): Uint8Array => {
  let offset = 0;
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const now = new Date();

  entries.forEach((entry) => {
    const filenameBytes = textEncoder.encode(entry.path);
    const data = entry.data;
    const crc = crc32(data);
    const size = data.length;
    const date = entry.date ?? now;
    const modTime = toDosTime(date);
    const modDate = toDosDate(date);
    const localHeaderLength = 30 + filenameBytes.length;
    const local = new Uint8Array(localHeaderLength + size);
    const localView = new DataView(local.buffer);

    let pointer = 0;
    localView.setUint32(pointer, 0x04034b50, true);
    pointer += 4;
    localView.setUint16(pointer, 20, true);
    pointer += 2;
    localView.setUint16(pointer, 0, true);
    pointer += 2;
    localView.setUint16(pointer, 0, true);
    pointer += 2;
    localView.setUint16(pointer, modTime, true);
    pointer += 2;
    localView.setUint16(pointer, modDate, true);
    pointer += 2;
    localView.setUint32(pointer, crc, true);
    pointer += 4;
    localView.setUint32(pointer, size, true);
    pointer += 4;
    localView.setUint32(pointer, size, true);
    pointer += 4;
    localView.setUint16(pointer, filenameBytes.length, true);
    pointer += 2;
    localView.setUint16(pointer, 0, true);
    pointer += 2;

    local.set(filenameBytes, pointer);
    pointer += filenameBytes.length;
    local.set(data, pointer);

    localParts.push(local);

    const centralHeaderLength = 46 + filenameBytes.length;
    const central = new Uint8Array(centralHeaderLength);
    const centralView = new DataView(central.buffer);
    pointer = 0;
    centralView.setUint32(pointer, 0x02014b50, true);
    pointer += 4;
    centralView.setUint16(pointer, 20, true);
    pointer += 2;
    centralView.setUint16(pointer, 20, true);
    pointer += 2;
    centralView.setUint16(pointer, 0, true);
    pointer += 2;
    centralView.setUint16(pointer, 0, true);
    pointer += 2;
    centralView.setUint16(pointer, modTime, true);
    pointer += 2;
    centralView.setUint16(pointer, modDate, true);
    pointer += 2;
    centralView.setUint32(pointer, crc, true);
    pointer += 4;
    centralView.setUint32(pointer, size, true);
    pointer += 4;
    centralView.setUint32(pointer, size, true);
    pointer += 4;
    centralView.setUint16(pointer, filenameBytes.length, true);
    pointer += 2;
    centralView.setUint16(pointer, 0, true);
    pointer += 2;
    centralView.setUint16(pointer, 0, true);
    pointer += 2;
    centralView.setUint16(pointer, 0, true);
    pointer += 2;
    centralView.setUint16(pointer, 0, true);
    pointer += 2;
    centralView.setUint32(pointer, 0, true);
    pointer += 4;
    centralView.setUint32(pointer, offset, true);
    pointer += 4;
    central.set(filenameBytes, pointer);

    centralParts.push(central);
    offset += local.length;
  });

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const centralOffset = offset;
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  const totalSize = offset + centralSize + end.length;
  const result = new Uint8Array(totalSize);
  let position = 0;
  localParts.forEach((part) => {
    result.set(part, position);
    position += part.length;
  });
  centralParts.forEach((part) => {
    result.set(part, position);
    position += part.length;
  });
  result.set(end, position);

  return result;
};

const buildSheetXml = (columns: ExportColumn[], rows: string[][]): string => {
  const headerCells = columns
    .map((column, index) => `<c r="${toColumnLetter(index + 1)}1" t="inlineStr"><is><t>${escapeXml(column.header)}</t></is></c>`)
    .join('');

  const bodyRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const cellValue = escapeXml(value);
          return `<c r="${toColumnLetter(columnIndex + 1)}${rowIndex + 2}" t="inlineStr"><is><t>${cellValue}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 2}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData><row r="1">${headerCells}</row>${bodyRows}</sheetData></worksheet>`;
};

const buildWorkbookXml = (sheetName: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
  `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const buildContentTypesXml = () =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '</Types>';

const buildRootRelsXml = () =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';

const buildWorkbookRelsXml = () =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '</Relationships>';

const buildXlsxFile = (columns: ExportColumn[], rows: string[][], sheetName: string) => {
  const safeSheetName = sheetName.replace(/[\\/:*?\[\]]/g, '').substring(0, 31) || 'Export';
  const sheetXml = buildSheetXml(columns, rows);
  const workbookXml = buildWorkbookXml(safeSheetName);
  const contentTypesXml = buildContentTypesXml();
  const rootRelsXml = buildRootRelsXml();
  const workbookRelsXml = buildWorkbookRelsXml();

  const entries: ZipEntry[] = [
    { path: '[Content_Types].xml', data: textEncoder.encode(contentTypesXml) },
    { path: '_rels/.rels', data: textEncoder.encode(rootRelsXml) },
    { path: 'xl/workbook.xml', data: textEncoder.encode(workbookXml) },
    { path: 'xl/_rels/workbook.xml.rels', data: textEncoder.encode(workbookRelsXml) },
    { path: 'xl/worksheets/sheet1.xml', data: textEncoder.encode(sheetXml) }
  ];

  return createZip(entries);
};

const buildCsv = (columns: ExportColumn[], rows: string[][]) => {
  const header = columns.map((column) => `"${column.header.replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map((row) =>
      row
        .map((value) => {
          const needsQuotes = /[",\n]/.test(value);
          const safe = value.replace(/"/g, '""');
          return needsQuotes ? `"${safe}"` : safe;
        })
        .join(',')
    )
    .join('\r\n');
  return `${header}${rows.length ? '\r\n' : ''}${body}`;
};

const truncateText = (value: string, maxLength = 120) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.substring(0, maxLength - 1)}…`;
};

const isNumericLike = (value: string) => {
  if (!value) {
    return false;
  }
  const normalized = value.replace(/[^0-9.,\-]/g, '').replace(/,/g, '.');
  return /^-?\d+(?:\.\d+)?$/.test(normalized);
};

const computeColumnWidths = (columns: ExportColumn[], rows: string[][], tableWidth: number) => {
  const charCounts = columns.map((column, index) => {
    const values = rows.map((row) => row[index] ?? '');
    const longest = Math.max(column.header.length, ...values.map((value) => value.length));
    return Math.max(longest, 6);
  });
  const totalChars = charCounts.reduce((sum, count) => sum + count, 0) || columns.length;
  const minWidth = tableWidth / columns.length * 0.25;
  let widths = charCounts.map((count) => Math.max((count / totalChars) * tableWidth, minWidth));
  const adjustedTotal = widths.reduce((sum, width) => sum + width, 0);
  const scale = tableWidth / adjustedTotal;
  widths = widths.map((width) => width * scale);
  const sum = widths.reduce((acc, width) => acc + width, 0);
  const diff = tableWidth - sum;
  widths[widths.length - 1] += diff;
  return widths;
};

const buildPdf = (title: string, columns: ExportColumn[], rows: string[][]) => {
  const pageWidth = 612;
  const pageHeight = 792;
  const horizontalMargin = 48;
  const verticalMargin = 64;
  const headerHeight = 28;
  const rowHeight = 22;
  const tableWidth = pageWidth - horizontalMargin * 2;
  const dataRows = rows.length
    ? rows
    : [columns.map((_, index) => (index === 0 ? 'No data available' : ''))];
  const columnWidths = computeColumnWidths(columns, dataRows, tableWidth);
  const columnOffsets = columns.map((_, index) => {
    let offset = horizontalMargin;
    for (let i = 0; i < index; i += 1) {
      offset += columnWidths[i];
    }
    return offset;
  });
  const numericColumns = columns.map((_, index) =>
    dataRows.every((row) => isNumericLike(row[index] ?? ''))
  );

  const pages: string[][] = [];
  let commands: string[] = [];
  let currentY = 0;

  const drawHeader = () => {
    const top = currentY;
    const bottom = top - headerHeight;
    commands.push('q');
    commands.push('0.90 0.95 1 rg');
    commands.push(`${horizontalMargin} ${bottom} ${tableWidth} ${headerHeight} re f`);
    commands.push('Q');
    commands.push('q');
    commands.push('0.70 0.78 0.92 RG');
    commands.push('1 w');
    commands.push(`${horizontalMargin} ${bottom} ${tableWidth} ${headerHeight} re S`);
    commands.push('Q');
    commands.push('0.18 0.25 0.45 rg');
    columns.forEach((column, index) => {
      const textX = columnOffsets[index] + 8;
      const textY = bottom + headerHeight - 10;
      commands.push(
        `BT /F1 10 Tf 1 0 0 1 ${textX} ${textY} Tm (${escapePdfText(column.header.toUpperCase())}) Tj ET`
      );
    });
    commands.push('0 0 0 rg');
    currentY = bottom;
  };

  const startPage = (isFirst: boolean) => {
    if (!isFirst) {
      pages.push(commands);
    }
    commands = [];
    currentY = pageHeight - verticalMargin;
    commands.push('0 0 0 rg');
    commands.push(`BT /F1 16 Tf 1 0 0 1 ${horizontalMargin} ${currentY} Tm (${escapePdfText(title)}) Tj ET`);
    currentY -= 36;
    drawHeader();
  };

  const appendRow = (row: string[], index: number) => {
    if (currentY - rowHeight < verticalMargin) {
      startPage(false);
    }
    const top = currentY;
    const bottom = top - rowHeight;
    if (index % 2 === 0) {
      commands.push('q');
      commands.push('0.97 0.99 1 rg');
      commands.push(`${horizontalMargin} ${bottom} ${tableWidth} ${rowHeight} re f`);
      commands.push('Q');
    }
    commands.push('q');
    commands.push('0.85 0.88 0.94 RG');
    commands.push('0.5 w');
    commands.push(`${horizontalMargin} ${bottom} ${tableWidth} ${rowHeight} re S`);
    commands.push('Q');

    row.forEach((value, columnIndex) => {
      const truncated = truncateText(value ?? '', 140);
      const textY = bottom + rowHeight - 8;
      let textX = columnOffsets[columnIndex] + 8;
      if (numericColumns[columnIndex]) {
        const approxWidth = Math.min(truncated.length * 5.2, columnWidths[columnIndex] - 10);
        textX = columnOffsets[columnIndex] + columnWidths[columnIndex] - approxWidth - 8;
      }
      const safeX = Math.max(textX, columnOffsets[columnIndex] + 8);
      commands.push(
        `BT /F1 10 Tf 1 0 0 1 ${safeX} ${textY} Tm (${escapePdfText(truncated)}) Tj ET`
      );
    });

    currentY = bottom;
  };

  startPage(true);
  dataRows.forEach((row, index) => appendRow(row, index));
  pages.push(commands);

  pages.forEach((pageCommands, pageIndex) => {
    const footerY = verticalMargin - 32;
    pageCommands.push('0.45 0.50 0.60 rg');
    pageCommands.push(
      `BT /F1 9 Tf 1 0 0 1 ${horizontalMargin} ${footerY} Tm (${escapePdfText(
        `Page ${pageIndex + 1} of ${pages.length}`
      )}) Tj ET`
    );
    pageCommands.push('0 0 0 rg');
  });

  const objects: string[] = [];
  const pageReferences: Array<{ pageId: number; contentId: number }> = [];

  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;

  pages.forEach((pageCommands, index) => {
    const content = pageCommands.join('\n');
    const contentStream = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    const contentId = 4 + index * 2;
    const pageId = contentId + 1;
    objects[contentId] = contentStream;
    const pageObject =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
    objects[pageId] = pageObject;
    pageReferences.push({ pageId, contentId });
  });

  const kids = pageReferences.map(({ pageId }) => `${pageId} 0 R`).join(' ');
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Count ${pages.length} /Kids [ ${kids} ] >>`;
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  const objectCount = objects.length - 1;
  const header = '%PDF-1.4\n';
  let body = '';
  const offsets: number[] = [0];
  let currentOffset = header.length;

  for (let id = 1; id <= objectCount; id += 1) {
    const objectContent = objects[id];
    if (!objectContent) {
      continue;
    }
    const serialized = `${id} 0 obj\n${objectContent}\nendobj\n`;
    body += serialized;
    offsets[id] = currentOffset;
    currentOffset += serialized.length;
  }

  const xrefOffset = header.length + body.length;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objectCount; id += 1) {
    const offset = offsets[id] ?? header.length;
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const pdfContent = header + body + xref + trailer;
  return textEncoder.encode(pdfContent);
};

const openPrintWindow = (title: string, columns: ExportColumn[], rows: string[][]) => {
  const htmlRows = rows
    .map((row) => `<tr>${row.map((value) => `<td style="padding:8px;border:1px solid #d1d5db;font-size:12px;">${value}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />` +
    `<title>${title}</title>` +
    '<style>body{font-family:Arial,sans-serif;padding:24px;}table{border-collapse:collapse;width:100%;}thead th{background:#f1f5f9;border:1px solid #d1d5db;padding:8px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;}</style>' +
    '</head><body>' +
    `<h1 style="font-size:20px;margin-bottom:16px;">${title}</h1>` +
    `<table><thead><tr>${columns
      .map((column) => `<th>${column.header}</th>`)
      .join('')}</tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
};

const formatValue = (value: string | number | boolean | null | undefined): string => {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return value;
};

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^a-z0-9\-]+/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'export';

const downloadBlob = (blob: Blob, fileName: string) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export interface ExportOptions {
  format: ExportFormat;
  columns: ExportColumn[];
  rows: ExportRow[];
  fileName: string;
  title?: string;
}

export const exportDataset = ({ format, columns, rows, fileName, title }: ExportOptions) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedRows = rows.map((row) => columns.map((column) => formatValue(row[column.key])));
  const safeFileName = sanitizeFileName(fileName);
  const sheetTitle = title ?? fileName;

  switch (format) {
    case 'xlsx': {
      const workbook = buildXlsxFile(columns, normalizedRows, sheetTitle);
      const blob = new Blob([toArrayBuffer(workbook)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      downloadBlob(blob, `${safeFileName}.xlsx`);
      break;
    }
    case 'csv': {
      const csv = buildCsv(columns, normalizedRows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${safeFileName}.csv`);
      break;
    }
    case 'pdf': {
      const pdfBytes = buildPdf(sheetTitle, columns, normalizedRows);
      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: 'application/pdf' });
      downloadBlob(blob, `${safeFileName}.pdf`);
      break;
    }
    case 'print': {
      openPrintWindow(sheetTitle, columns, normalizedRows);
      break;
    }
    default:
      break;
  }
};

