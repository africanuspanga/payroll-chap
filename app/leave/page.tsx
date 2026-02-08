"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";

type LeaveRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string | null;
  leavePolicyId: string;
  leaveType: string;
  leaveCode: string;
  startsOn: string;
  endsOn: string;
  daysRequested: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
};

type LeaveSetup = {
  employees: Array<{ id: string; label: string }>;
  leavePolicies: Array<{ id: string; code: string; name: string; isPaid: boolean }>;
};

type LeaveForm = {
  employeeId: string;
  leavePolicyId: string;
  startsOn: string;
  endsOn: string;
  daysRequested: string;
};

type CsvRejectedRow = {
  rowNumber: number;
  reason: string;
  employeeNo?: string | null;
  employeeId?: string | null;
  workDate?: string | null;
};

const defaultLeaveForm: LeaveForm = {
  employeeId: "",
  leavePolicyId: "",
  startsOn: "",
  endsOn: "",
  daysRequested: "",
};

export default function LeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRecord[]>([]);
  const [setup, setSetup] = useState<LeaveSetup>({ employees: [], leavePolicies: [] });

  const [leaveForm, setLeaveForm] = useState<LeaveForm>(defaultLeaveForm);
  const [decisionNote, setDecisionNote] = useState("");

  const [timesheetJsonInput, setTimesheetJsonInput] = useState(
    JSON.stringify(
      [
        {
          employeeNo: "KH-005",
          workDate: new Date().toISOString().slice(0, 10),
          hoursWorked: 8,
          overtimeHours: 2,
          lateMinutes: 5,
        },
      ],
      null,
      2,
    ),
  );
  const [timesheetCsvText, setTimesheetCsvText] = useState(
    [
      "employeeNo,workDate,hoursWorked,overtimeHours,lateMinutes,sourceRef",
      `KH-005,${new Date().toISOString().slice(0, 10)},8,2,5,batch-csv-1`,
    ].join("\n"),
  );
  const [csvHasHeader, setCsvHasHeader] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [isImportingTimesheets, setIsImportingTimesheets] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvRejectedRows, setCsvRejectedRows] = useState<CsvRejectedRow[]>([]);

  const pendingCount = useMemo(
    () => leaveRequests.filter((request) => request.status === "pending").length,
    [leaveRequests],
  );

  const approvedThisCycle = useMemo(
    () => leaveRequests.filter((request) => request.status === "approved").length,
    [leaveRequests],
  );

  const unpaidCount = useMemo(
    () => leaveRequests.filter((request) => request.leaveCode === "UNPAID").length,
    [leaveRequests],
  );

  const loadLeaveData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [requestsResponse, setupResponse] = await Promise.all([
        fetch("/api/v1/leave-requests", { cache: "no-store" }),
        fetch("/api/v1/leave/setup", { cache: "no-store" }),
      ]);

      const requestsPayload = (await requestsResponse.json()) as {
        data?: LeaveRecord[];
        error?: { message?: string };
      };

      const setupPayload = (await setupResponse.json()) as {
        data?: LeaveSetup;
        error?: { message?: string };
      };

      if (!requestsResponse.ok || !requestsPayload.data) {
        throw new Error(requestsPayload.error?.message ?? "Failed to load leave requests");
      }

      if (!setupResponse.ok || !setupPayload.data) {
        throw new Error(setupPayload.error?.message ?? "Failed to load leave setup");
      }

      setLeaveRequests(requestsPayload.data);
      setSetup(setupPayload.data);

      setLeaveForm((previous) => ({
        employeeId: previous.employeeId || setupPayload.data!.employees[0]?.id || "",
        leavePolicyId: previous.leavePolicyId || setupPayload.data!.leavePolicies[0]?.id || "",
        startsOn: previous.startsOn,
        endsOn: previous.endsOn,
        daysRequested: previous.daysRequested,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load leave data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaveData();
  }, [loadLeaveData]);

  async function submitLeaveRequest() {
    setError(null);
    setMessage(null);

    if (
      !leaveForm.employeeId ||
      !leaveForm.leavePolicyId ||
      !leaveForm.startsOn ||
      !leaveForm.endsOn ||
      !leaveForm.daysRequested
    ) {
      setError("Complete all leave request fields.");
      return;
    }

    setIsSubmittingLeave(true);

    try {
      const response = await fetch("/api/v1/leave-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: leaveForm.employeeId,
          leavePolicyId: leaveForm.leavePolicyId,
          startsOn: leaveForm.startsOn,
          endsOn: leaveForm.endsOn,
          daysRequested: Number(leaveForm.daysRequested),
        }),
      });

      const payload = (await response.json()) as {
        data?: unknown;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to submit leave request");
      }

      setMessage("Leave request submitted.");
      setLeaveForm((previous) => ({ ...previous, startsOn: "", endsOn: "", daysRequested: "" }));
      await loadLeaveData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit leave request");
    } finally {
      setIsSubmittingLeave(false);
    }
  }

  async function decideLeaveRequest(requestId: string, targetStatus: "approved" | "rejected") {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/leave-requests/${requestId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetStatus,
          decisionNote: decisionNote || undefined,
        }),
      });

      const payload = (await response.json()) as {
        data?: unknown;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to decide leave request");
      }

      setMessage(`Leave request ${targetStatus}.`);
      setDecisionNote("");
      await loadLeaveData();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Failed to decide leave request");
    }
  }

  async function importTimesheets(payload: {
    source: string;
    rows?: unknown[];
    csvText?: string;
    csvHasHeader?: boolean;
  }) {
    setError(null);
    setMessage(null);
    setCsvRejectedRows([]);
    setIsImportingTimesheets(true);

    try {
      const response = await fetch("/api/v1/timesheets/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        data?: {
          importedCount?: number;
          rejectedCount?: number;
          csvRejectedRows?: CsvRejectedRow[];
        };
        error?: { message?: string };
      };

      if (!response.ok || !result.data) {
        throw new Error(result.error?.message ?? "Failed to import timesheets");
      }

      const rejectedCsvRows = result.data.csvRejectedRows ?? [];
      const rejectedCsv = rejectedCsvRows.length;
      setCsvRejectedRows(rejectedCsvRows);
      setMessage(
        `Timesheets imported. Success: ${result.data.importedCount ?? 0}, Rejected: ${result.data.rejectedCount ?? 0}${
          rejectedCsv ? ` (CSV rejects: ${rejectedCsv})` : ""
        }`,
      );
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Failed to import timesheets");
    } finally {
      setIsImportingTimesheets(false);
    }
  }

  async function importTimesheetsFromJson() {
    let rows: unknown;

    try {
      rows = JSON.parse(timesheetJsonInput);
    } catch {
      setError("Timesheet JSON is invalid.");
      return;
    }

    if (!Array.isArray(rows)) {
      setError("Timesheet JSON must be an array.");
      return;
    }

    await importTimesheets({
      source: "manual_json",
      rows,
    });
  }

  async function importTimesheetsFromCsv() {
    if (!timesheetCsvText.trim()) {
      setError("CSV text is empty.");
      return;
    }

    await importTimesheets({
      source: "manual_csv",
      csvText: timesheetCsvText,
      csvHasHeader,
    });
  }

  async function handleCsvFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setTimesheetCsvText(text);
      setMessage(`Loaded CSV file: ${file.name}`);
      setError(null);
    } catch {
      setError("Failed to read selected CSV file.");
    }
  }

  return (
    <AppShell
      title="Leave Management"
      subtitle="Request, approve, and sync unpaid leave into payroll calculations"
      action={
        <button className="pc-button" onClick={loadLeaveData}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {error ? (
        <article className="pc-card pc-animate" style={{ borderColor: "#fecaca", background: "#fff1f2" }}>
          <p className="pc-trend" style={{ color: "#9f1239" }}>
            {error}
          </p>
        </article>
      ) : null}

      {message ? (
        <article className="pc-card pc-animate" style={{ borderColor: "#99f6e4", background: "#f0fdfa" }}>
          <p className="pc-trend" style={{ color: "#115e59" }}>
            {message}
          </p>
        </article>
      ) : null}

      <div className="pc-grid pc-grid-3">
        <article className="pc-card pc-animate">
          <p className="pc-label">Pending Approvals</p>
          <p className="pc-value">{pendingCount}</p>
          <p className="pc-trend">Awaiting manager action</p>
        </article>
        <article className="pc-card pc-animate">
          <p className="pc-label">Approved Requests</p>
          <p className="pc-value">{approvedThisCycle}</p>
          <p className="pc-trend">Current request list</p>
        </article>
        <article className="pc-card pc-animate">
          <p className="pc-label">Unpaid Leave Requests</p>
          <p className="pc-value">{unpaidCount}</p>
          <p className="pc-trend">Feeds payroll proration logic</p>
        </article>
      </div>

      <article className="pc-card pc-animate">
        <h3>Create Leave Request</h3>
        <div className="pc-form-grid">
          <label>
            Employee
            <select
              value={leaveForm.employeeId}
              onChange={(event) => setLeaveForm((previous) => ({ ...previous, employeeId: event.target.value }))}
            >
              {setup.employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Leave Policy
            <select
              value={leaveForm.leavePolicyId}
              onChange={(event) =>
                setLeaveForm((previous) => ({ ...previous, leavePolicyId: event.target.value }))
              }
            >
              {setup.leavePolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name} ({policy.code})
                </option>
              ))}
            </select>
          </label>

          <label>
            Start Date
            <input
              type="date"
              value={leaveForm.startsOn}
              onChange={(event) => setLeaveForm((previous) => ({ ...previous, startsOn: event.target.value }))}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={leaveForm.endsOn}
              onChange={(event) => setLeaveForm((previous) => ({ ...previous, endsOn: event.target.value }))}
            />
          </label>

          <label>
            Days Requested
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={leaveForm.daysRequested}
              onChange={(event) =>
                setLeaveForm((previous) => ({ ...previous, daysRequested: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="pc-toolbar" style={{ marginTop: "0.9rem" }}>
          <button className="pc-button" onClick={submitLeaveRequest} disabled={isSubmittingLeave}>
            {isSubmittingLeave ? "Submitting..." : "Submit Leave Request"}
          </button>
        </div>
      </article>

      <article className="pc-card pc-animate">
        <h3>Attendance/Timesheet Import</h3>
        <p className="pc-muted">Use JSON or CSV. CSV supports header row fields: employeeNo,workDate,hoursWorked,overtimeHours,lateMinutes,sourceRef.</p>

        <div className="pc-grid pc-grid-2">
          <div>
            <p className="pc-label">JSON Import</p>
            <textarea
              rows={10}
              value={timesheetJsonInput}
              onChange={(event) => setTimesheetJsonInput(event.target.value)}
              style={{ width: "100%", resize: "vertical" }}
            />
            <div className="pc-toolbar" style={{ marginTop: "0.9rem" }}>
              <button className="pc-button ghost" onClick={importTimesheetsFromJson} disabled={isImportingTimesheets}>
                {isImportingTimesheets ? "Importing..." : "Import JSON"}
              </button>
            </div>
          </div>

          <div>
            <p className="pc-label">CSV Upload / Paste</p>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvFileSelect} />
            <label className="pc-muted" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input type="checkbox" checked={csvHasHeader} onChange={(event) => setCsvHasHeader(event.target.checked)} />
              CSV has header row
            </label>
            <textarea
              rows={8}
              value={timesheetCsvText}
              onChange={(event) => setTimesheetCsvText(event.target.value)}
              style={{ width: "100%", resize: "vertical", marginTop: 8 }}
            />
            <div className="pc-toolbar" style={{ marginTop: "0.9rem" }}>
              <button className="pc-button ghost" onClick={importTimesheetsFromCsv} disabled={isImportingTimesheets}>
                {isImportingTimesheets ? "Importing..." : "Import CSV"}
              </button>
            </div>
          </div>
        </div>
      </article>

      {csvRejectedRows.length ? (
        <article className="pc-card pc-animate">
          <h3>CSV Rejected Rows</h3>
          <p className="pc-muted">Rows below were skipped with exact rejection reasons.</p>
          <div className="pc-table-wrap">
            <table className="pc-table">
              <thead>
                <tr>
                  <th>CSV Row</th>
                  <th>Employee Ref</th>
                  <th>Work Date</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {csvRejectedRows.map((row, index) => (
                  <tr key={`${row.rowNumber}-${index}`}>
                    <td>{row.rowNumber}</td>
                    <td>{row.employeeNo ?? row.employeeId ?? "-"}</td>
                    <td>{row.workDate ?? "-"}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      <article className="pc-card pc-animate">
        <h3>Leave Requests</h3>

        <label className="pc-muted">
          Decision note (optional, applied when approving/rejecting)
          <input value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} />
        </label>

        <div className="pc-table-wrap">
          <table className="pc-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.length ? (
                leaveRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      {request.employeeName}
                      {request.employeeNo ? <span className="pc-muted"> ({request.employeeNo})</span> : null}
                    </td>
                    <td>{request.leaveType}</td>
                    <td>
                      {request.startsOn} - {request.endsOn}
                    </td>
                    <td>{request.daysRequested}</td>
                    <td>
                      <span
                        className={`pc-chip ${
                          request.status === "approved"
                            ? "ok"
                            : request.status === "rejected"
                              ? "warn"
                              : "pending"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td>
                      {request.status === "pending" ? (
                        <RoleGate permission="approveLeave" fallback={<span className="pc-muted">No action rights</span>}>
                          <button className="pc-text-btn" onClick={() => decideLeaveRequest(request.id, "approved")}>
                            Approve
                          </button>
                          <button className="pc-text-btn" onClick={() => decideLeaveRequest(request.id, "rejected")}>
                            Reject
                          </button>
                        </RoleGate>
                      ) : (
                        <span className="pc-muted">Decided</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="pc-muted">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </AppShell>
  );
}
