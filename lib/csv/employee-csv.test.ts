import assert from "node:assert/strict";
import test from "node:test";
import { parseEmployeeCsv } from "./employee-csv";

test("parseEmployeeCsv parses header-based rows", () => {
  const input = [
    "employeeNo,firstName,lastName,hireDate,basicSalary,paymentMethod",
    "KH-101,Amina,Mushi,2026-02-01,850000,bank",
    "KH-102,John,Nyoni,2026-02-02,920000,mobile_money",
  ].join("\n");

  const result = parseEmployeeCsv({ csvText: input });

  assert.equal(result.rows.length, 2);
  assert.equal(result.rejectedRows.length, 0);
  assert.equal(result.rows[0].employeeNo, "KH-101");
  assert.equal(result.rows[0].firstName, "Amina");
  assert.equal(result.rows[0].csvRowNumber, 2);
});

test("parseEmployeeCsv rejects empty lines with mapped columns", () => {
  const input = [
    "employeeNo,firstName,lastName,hireDate,basicSalary",
    ",,,,",
    "KH-103,Rehema,Peter,2026-02-03,700000",
  ].join("\n");

  const result = parseEmployeeCsv({ csvText: input });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rejectedRows.length, 1);
  assert.equal(result.rejectedRows[0].reason, "Empty row");
});
