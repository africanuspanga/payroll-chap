export type ParsedTimesheetRow = {
  employeeId?: string;
  employeeNo?: string;
  workDate?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  sourceRef?: string;
  csvRowNumber?: number;
};

export type CsvParseResult = {
  rows: ParsedTimesheetRow[];
  rejectedRows: Array<{ rowNumber: number; reason: string }>;
};

type CsvColumnField = Exclude<keyof ParsedTimesheetRow, "csvRowNumber">;

const supportedHeaders = {
  employeeid: "employeeId",
  employeeno: "employeeNo",
  workdate: "workDate",
  hoursworked: "hoursWorked",
  overtimehours: "overtimeHours",
  lateminutes: "lateMinutes",
  sourceref: "sourceRef",
} as const;

export function parseTimesheetCsv(input: { csvText: string; hasHeader?: boolean }): CsvParseResult {
  const hasHeader = input.hasHeader ?? true;
  const lines = splitCsvLines(input.csvText).filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return { rows: [], rejectedRows: [] };
  }

  const parsedLines = lines.map(parseCsvLine);
  let headerMap: Record<number, CsvColumnField> = {
    0: "employeeNo",
    1: "workDate",
    2: "hoursWorked",
    3: "overtimeHours",
    4: "lateMinutes",
    5: "sourceRef",
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

  const rows: ParsedTimesheetRow[] = [];
  const rejectedRows: Array<{ rowNumber: number; reason: string }> = [];

  for (let lineIndex = startIndex; lineIndex < parsedLines.length; lineIndex += 1) {
    const cells = parsedLines[lineIndex];
    const row: ParsedTimesheetRow = {};

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const field = headerMap[cellIndex];
      if (!field) {
        continue;
      }

      const value = cells[cellIndex].trim();

      if (field === "hoursWorked" || field === "overtimeHours" || field === "lateMinutes") {
        const numeric = Number(value);
        if (value.length > 0 && Number.isFinite(numeric)) {
          row[field] = numeric;
        }
      } else if (value.length > 0) {
        row[field] = value;
      }
    }

    if (!row.employeeId && !row.employeeNo) {
      rejectedRows.push({
        rowNumber: lineIndex + 1,
        reason: "Missing employeeId or employeeNo",
      });
      continue;
    }

    if (!row.workDate) {
      rejectedRows.push({
        rowNumber: lineIndex + 1,
        reason: "Missing workDate",
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
