import type { UnitType } from '../types';

export interface ParsedSalesOrderParty {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
}

export interface ParsedSalesOrderItem {
  skuId: string;
  skuName?: string;
  quantity: number;
  unitType: UnitType;
  unitWeight?: number;
  unitPrice?: number;
  length?: number;
  width?: number;
  height?: number;
  packType?: string;
  description?: string;
}

export interface ParsedSalesOrder {
  from: ParsedSalesOrderParty;
  to: ParsedSalesOrderParty;
  items: ParsedSalesOrderItem[];
  poNumber?: string;
  orderDate?: string;
  currency?: string;
}

interface HeaderIndexMap {
  [key: string]: number;
}

const REQUIRED_COLUMNS = [
  'from_name',
  'from_address',
  'from_city',
  'from_state',
  'from_zip',
  'to_name',
  'to_address',
  'to_city',
  'to_state',
  'to_zip',
  'sku',
  'quantity'
];

const CSV_NEWLINE_REGEX = /\r?\n/;

export function parseSalesOrderCSV(csvContent: string): ParsedSalesOrder {
  const lines = csvContent
    .split(CSV_NEWLINE_REGEX)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) {
    throw new Error('Sales order file must include a header row and at least one data row.');
  }

  const headerCells = parseCSVLine(lines[0]);
  const headerIndexMap: HeaderIndexMap = {};

  headerCells.forEach((rawHeader, index) => {
    if (!rawHeader) return;
    headerIndexMap[normalizeHeader(rawHeader)] = index;
  });

  const missingColumns = REQUIRED_COLUMNS.filter(column => !(column in headerIndexMap));
  if (missingColumns.length > 0) {
    throw new Error(`Sales order file is missing required columns: ${missingColumns.join(', ')}`);
  }

  const firstDataRow = parseCSVLine(lines[1]);

  const fromParty: ParsedSalesOrderParty = {
    name: getValue(firstDataRow, headerIndexMap, 'from_name'),
    address: getValue(firstDataRow, headerIndexMap, 'from_address'),
    city: getValue(firstDataRow, headerIndexMap, 'from_city'),
    state: getValue(firstDataRow, headerIndexMap, 'from_state'),
    zip: getValue(firstDataRow, headerIndexMap, 'from_zip'),
    phone: getOptionalValue(firstDataRow, headerIndexMap, 'from_phone'),
    email: getOptionalValue(firstDataRow, headerIndexMap, 'from_email')
  };

  const toParty: ParsedSalesOrderParty = {
    name: getValue(firstDataRow, headerIndexMap, 'to_name'),
    address: getValue(firstDataRow, headerIndexMap, 'to_address'),
    city: getValue(firstDataRow, headerIndexMap, 'to_city'),
    state: getValue(firstDataRow, headerIndexMap, 'to_state'),
    zip: getValue(firstDataRow, headerIndexMap, 'to_zip'),
    phone: getOptionalValue(firstDataRow, headerIndexMap, 'to_phone'),
    email: getOptionalValue(firstDataRow, headerIndexMap, 'to_email')
  };

  const items: ParsedSalesOrderItem[] = [];
  let currency: string | undefined;
  let orderDate: string | undefined = getOptionalValue(firstDataRow, headerIndexMap, 'order_date');
  let poNumber: string | undefined = getOptionalValue(firstDataRow, headerIndexMap, 'po_number');

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const rowCells = parseCSVLine(lines[lineIndex]);
    if (rowCells.length === 0 || rowCells.every(cell => cell.trim().length === 0)) {
      continue;
    }

    const skuId = getValue(rowCells, headerIndexMap, 'sku');
    const quantityRaw = getValue(rowCells, headerIndexMap, 'quantity');
    const quantity = parseNumber(quantityRaw, 'quantity', lineIndex + 1);

    const unitTypeValue = getOptionalValue(rowCells, headerIndexMap, 'unit_type');
    const unitType: UnitType = isValidUnitType(unitTypeValue)
      ? (unitTypeValue!.toLowerCase() as UnitType)
      : 'each';

    const unitWeightRaw = getOptionalValue(rowCells, headerIndexMap, 'unit_weight');
    const unitWeight = unitWeightRaw ? parseNumber(unitWeightRaw, 'unit_weight', lineIndex + 1, true) : undefined;

    const unitPriceRaw = getOptionalValue(rowCells, headerIndexMap, 'unit_price') ?? getOptionalValue(rowCells, headerIndexMap, 'price');
    const unitPrice = unitPriceRaw ? parseNumber(unitPriceRaw, 'unit_price', lineIndex + 1, true) : undefined;

    const skuName = getOptionalValue(rowCells, headerIndexMap, 'sku_name');
    const length = getDimension(rowCells, headerIndexMap, 'length');
    const width = getDimension(rowCells, headerIndexMap, 'width');
    const height = getDimension(rowCells, headerIndexMap, 'height');
    const packType = getOptionalValue(rowCells, headerIndexMap, 'pack_type');
    const description = getOptionalValue(rowCells, headerIndexMap, 'description');

    if (!currency) {
      currency = getOptionalValue(rowCells, headerIndexMap, 'currency') ?? currency;
    }

    if (!orderDate) {
      orderDate = getOptionalValue(rowCells, headerIndexMap, 'order_date') ?? orderDate;
    }

    if (!poNumber) {
      poNumber = getOptionalValue(rowCells, headerIndexMap, 'po_number') ?? poNumber;
    }

    items.push({
      skuId,
      skuName,
      quantity,
      unitType,
      unitWeight,
      unitPrice,
      length,
      width,
      height,
      packType,
      description
    });
  }

  if (items.length === 0) {
    throw new Error('Sales order file does not contain any item rows.');
  }

  return {
    from: fromParty,
    to: toParty,
    items,
    currency,
    orderDate,
    poNumber
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function getValue(row: string[], headerMap: HeaderIndexMap, key: string): string {
  const index = headerMap[key];
  if (index === undefined) {
    throw new Error(`Missing required column: ${key}`);
  }
  const value = (row[index] ?? '').trim();
  if (!value) {
    throw new Error(`Missing value for required column "${key}"`);
  }
  return value;
}

function getOptionalValue(row: string[], headerMap: HeaderIndexMap, key: string): string | undefined {
  if (!(key in headerMap)) {
    return undefined;
  }
  const value = (row[headerMap[key]] ?? '').trim();
  return value.length > 0 ? value : undefined;
}

function parseNumber(value: string, columnName: string, lineNumber: number, allowZero = false): number {
  const cleaned = value.replace(/[$,]/g, '');
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for "${columnName}" on row ${lineNumber}: ${value}`);
  }

  if (!allowZero && parsed <= 0) {
    throw new Error(`Value for "${columnName}" on row ${lineNumber} must be greater than zero.`);
  }

  if (allowZero && parsed < 0) {
    throw new Error(`Value for "${columnName}" on row ${lineNumber} cannot be negative.`);
  }

  return parsed;
}

function getDimension(row: string[], headerMap: HeaderIndexMap, key: string): number | undefined {
  const value = getOptionalValue(row, headerMap, key);
  return value ? parseNumber(value, key, 0, true) : undefined;
}

function isValidUnitType(value?: string): value is UnitType {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === 'each' || normalized === 'case';
}
