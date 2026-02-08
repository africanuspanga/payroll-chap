import assert from "node:assert/strict";
import test from "node:test";
import { parseTimesheetCsv } from "./timesheet-csv";

test("parseTimesheetCsv parses header-based CSV rows", () => {
  const input = [
    "employeeNo,workDate,hoursWorked,overtimeHours,lateMinutes,sourceRef",
    "KH-001,2026-02-04,8,2,10,manual-1",
    "KH-002,2026-02-04,8,0,0,manual-2",
  ].join("\n");

  const result = parseTimesheetCsv({ csvText: input });

  assert.equal(result.rows.length, 2);
  assert.equal(result.rejectedRows.length, 0);
  assert.equal(result.rows[0].employeeNo, "KH-001");
  assert.equal(result.rows[0].overtimeHours, 2);
  assert.equal(result.rows[0].csvRowNumber, 2);
});

test("parseTimesheetCsv rejects rows without employee and work date", () => {
  const input = [
    "employeeNo,workDate,hoursWorked",
    ",2026-02-05,8",
    "KH-003,,8",
  ].join("\n");

  const result = parseTimesheetCsv({ csvText: input });

  assert.equal(result.rows.length, 0);
  assert.equal(result.rejectedRows.length, 2);
});
