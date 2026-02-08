export type ParsedEmployeeCsvRow = {
  employeeNo?: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  phone?: string;
  hireDate?: string;
  employmentType?: string;
  taxResidency?: string;
  isPrimaryEmployment?: string;
  isNonFullTimeDirector?: string;
  paymentMethod?: string;
  bankName?: string;
  bankAccountNo?: string;
  mobileMoneyProvider?: string;
  mobileMoneyNo?: string;
  department?: string;
  jobTitle?: string;
  basicSalary?: string;
  contractType?: string;
  csvRowNumber?: number;
};

export type CsvParseResult = {
  rows: ParsedEmployeeCsvRow[];
  rejectedRows: Array<{ rowNumber: number; reason: string }>;
};

type CsvColumnField = Exclude<keyof ParsedEmployeeCsvRow, "csvRowNumber">;

const supportedHeaders = {
  employeeno: "employeeNo",
  firstname: "firstName",
  lastname: "lastName",
  workemail: "workEmail",
  phone: "phone",
  hiredate: "hireDate",
  employmenttype: "employmentType",
  taxresidency: "taxResidency",
  isprimaryemployment: "isPrimaryEmployment",
  isnonfulltimedirector: "isNonFullTimeDirector",
  paymentmethod: "paymentMethod",
  bankname: "bankName",
  bankaccountno: "bankAccountNo",
  mobilemoneyprovider: "mobileMoneyProvider",
  mobilemoneyno: "mobileMoneyNo",
  department: "department",
  jobtitle: "jobTitle",
  basicsalary: "basicSalary",
  contracttype: "contractType",
} as const;

export function parseEmployeeCsv(input: { csvText: string; hasHeader?: boolean }): CsvParseResult {
  const hasHeader = input.hasHeader ?? true;
  const lines = splitCsvLines(input.csvText).filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return { rows: [], rejectedRows: [] };
  }

  const parsedLines = lines.map(parseCsvLine);
  let headerMap: Record<number, CsvColumnField> = {
    0: "employeeNo",
    1: "firstName",
    2: "lastName",
    3: "workEmail",
    4: "phone",
    5: "hireDate",
    6: "employmentType",
    7: "taxResidency",
    8: "paymentMethod",
    9: "basicSalary",
    10: "contractType",
    11: "department",
    12: "jobTitle",
  };

  let startIndex = 0;

  if (hasHeader) {
    const header = parsedLines[0].map((cell) => normalizeHeader(cell));
    const map: Record<number, CsvColumnField> = {};

    for (let index = 0; index < header.length; index += 1) {
      const field = supportedHeaders[header[index] as keyof typeof supportedHeaders];
      if (field) {
        map[index] = field;
      }
    }

    if (Object.keys(map).length) {
      headerMap = map;
    }

    startIndex = 1;
  }

  const rows: ParsedEmployeeCsvRow[] = [];
  const rejectedRows: Array<{ rowNumber: number; reason: string }> = [];

  for (let lineIndex = startIndex; lineIndex < parsedLines.length; lineIndex += 1) {
    const cells = parsedLines[lineIndex];
    const row: ParsedEmployeeCsvRow = {};
    let hasValue = false;

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const field = headerMap[cellIndex];
      if (!field) {
        continue;
      }

      const value = cells[cellIndex].trim();
      if (value.length > 0) {
        row[field] = value;
        hasValue = true;
      }
    }

    if (!hasValue) {
      rejectedRows.push({
        rowNumber: lineIndex + 1,
        reason: "Empty row",
      });
      continue;
    }

    rows.push({
      ...row,
      csvRowNumber: lineIndex + 1,
    });
  }

  return { rows, rejectedRows };
}

function splitCsvLines(csvText: string) {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      lines.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalizeHeader(header: string) {
  return header.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}
