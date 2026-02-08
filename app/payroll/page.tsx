"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";

type PayrollRunSummary = {
  id: string;
  runLabel: string;
  status: PayrollRunStatus;
  periodYear: number | null;
  periodMonth: number | null;
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  employeeCount: number;
  createdAt: string;
};

type PayrollRunStatus = "draft" | "validated" | "approved" | "locked" | "paid";

type PayrollRunDetail = {
  id: string;
  runLabel: string;
  status: PayrollRunStatus;
  periodYear: number | null;
  periodMonth: number | null;
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  lockedAt: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    employeeId: string;
    employeeNo: string | null;
    employeeName: string;
    grossPay: number;
    taxablePay: number;
    totalDeductions: number;
    netPay: number;
    calcSnapshot: {
      prorationFactor?: number;
      warnings?: string[];
    };
  }>;
};

const nextStatusMap: Partial<Record<PayrollRunStatus, PayrollRunStatus>> = {
  draft: "validated",
  validated: "approved",
  approved: "locked",
  locked: "paid",
};

export default function PayrollPage() {
  const now = useMemo(() => new Date(), []);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);

  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRunDetail | null>(null);

  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentRun = selectedRun;
  const nextStatus = currentRun ? nextStatusMap[currentRun.status] : undefined;

  const loadRuns = useCallback(async () => {
    setIsLoadingRuns(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/payroll/runs?limit=20", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: PayrollRunSummary[];
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to load payroll runs");
      }

      const runData = payload.data;
      setRuns(runData);

      if (runData.length > 0) {
        setSelectedRunId((existing) => existing ?? runData[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payroll runs");
    } finally {
      setIsLoadingRuns(false);
    }
  }, []);

  const loadRunDetail = useCallback(async (runId: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/v1/payroll/runs/${runId}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: PayrollRunDetail;
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to load payroll run details");
      }

      setSelectedRun(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payroll run details");
      setSelectedRun(null);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }
    void loadRunDetail(selectedRunId);
  }, [selectedRunId, loadRunDetail]);

  async function handleGenerateDraft() {
    setIsGeneratingDraft(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/v1/payroll/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodYear,
          periodMonth,
          runLabel: "main",
        }),
      });

      const payload = (await response.json()) as {
        data?: { payrollRunId?: string; warnings?: string[] };
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to generate payroll draft");
      }

      await loadRuns();

      if (payload.data.payrollRunId) {
        setSelectedRunId(payload.data.payrollRunId);
        await loadRunDetail(payload.data.payrollRunId);
      }

      const warningCount = payload.data.warnings?.length ?? 0;
      setMessage(
        warningCount > 0
          ? `Payroll draft generated with ${warningCount} warning(s). Review run details before approval.`
          : "Payroll draft generated successfully.",
      );
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Failed to generate payroll draft");
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function handleStatusTransition(targetStatus: PayrollRunStatus) {
    if (!currentRun) {
      return;
    }

    setIsChangingStatus(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/v1/payroll/runs/${currentRun.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetStatus }),
      });

      const payload = (await response.json()) as {
        data?: { status?: PayrollRunStatus };
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to update payroll run status");
      }

      await Promise.all([loadRuns(), loadRunDetail(currentRun.id)]);
      setMessage(`Run status updated to ${targetStatus}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update payroll run status");
    } finally {
      setIsChangingStatus(false);
    }
  }

  return (
    <AppShell
      title="Payroll Engine"
      subtitle="Draft, validate, approve, lock, and mark paid"
      action={
        <RoleGate permission="runPayroll" fallback={<button className="pc-button ghost">No Approval Rights</button>}>
          <button className="pc-button" onClick={handleGenerateDraft} disabled={isGeneratingDraft}>
            {isGeneratingDraft ? "Generating..." : "Generate Draft"}
          </button>
        </RoleGate>
      }
    >
      {error ? (
        <article className="pc-card pc-animate" style={{ borderColor: "#fecaca", background: "#fff1f2" }}>
          <p className="pc-label" style={{ color: "#9f1239" }}>
            Error
          </p>
          <p className="pc-trend" style={{ color: "#9f1239" }}>
            {error}
          </p>
        </article>
      ) : null}

      {message ? (
        <article className="pc-card pc-animate" style={{ borderColor: "#99f6e4", background: "#f0fdfa" }}>
          <p className="pc-label" style={{ color: "#0f766e" }}>
            Update
          </p>
          <p className="pc-trend" style={{ color: "#115e59" }}>
            {message}
          </p>
        </article>
      ) : null}

      <div className="pc-grid pc-grid-3">
        <article className="pc-card pc-animate">
          <p className="pc-label">Payroll Month</p>
          <div className="pc-row" style={{ marginTop: "0.4rem" }}>
            <select value={periodMonth} onChange={(event) => setPeriodMonth(Number(event.target.value))}>
              {Array.from({ length: 12 }).map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {String(index + 1).padStart(2, "0")}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={periodYear}
              min={2024}
              max={2100}
              onChange={(event) => setPeriodYear(Number(event.target.value))}
            />
          </div>
          <p className="pc-trend">Run a new draft for the selected period.</p>
        </article>

        <article className="pc-card pc-animate">
          <p className="pc-label">Selected Run Gross</p>
          <p className="pc-value">TZS {formatAmount(currentRun?.grossTotal ?? 0)}</p>
          <p className="pc-trend">Includes prorated salary, overtime, arrears, bonus, and allowances</p>
        </article>

        <article className="pc-card pc-animate">
          <p className="pc-label">Selected Run Net</p>
          <p className="pc-value">TZS {formatAmount(currentRun?.netTotal ?? 0)}</p>
          <p className="pc-trend">After statutory, loan, and manual deductions</p>
        </article>
      </div>

      <article className="pc-card pc-animate">
        <div className="pc-toolbar">
          <select
            aria-label="Select payroll run"
            value={selectedRunId ?? ""}
            onChange={(event) => setSelectedRunId(event.target.value)}
          >
            {runs.length === 0 ? <option value="">No payroll runs yet</option> : null}
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.periodYear}-{String(run.periodMonth ?? 0).padStart(2, "0")} | {run.runLabel} | {run.status}
              </option>
            ))}
          </select>

          <button className="pc-button ghost" onClick={loadRuns} disabled={isLoadingRuns}>
            {isLoadingRuns ? "Refreshing..." : "Refresh Runs"}
          </button>

          {nextStatus ? (
            <RoleGate permission="runPayroll">
              <button className="pc-button ghost" onClick={() => handleStatusTransition(nextStatus)} disabled={isChangingStatus}>
                {isChangingStatus ? "Saving..." : `Move to ${nextStatus}`}
              </button>
            </RoleGate>
          ) : null}
        </div>

        <div className="pc-grid pc-grid-3" style={{ marginBottom: "0.9rem" }}>
          <div>
            <p className="pc-label">Run Status</p>
            <span className={`pc-chip ${chipClass(currentRun?.status)}`}>{currentRun?.status ?? "n/a"}</span>
          </div>
          <div>
            <p className="pc-label">Employees in Run</p>
            <p className="pc-trend">{currentRun?.items.length ?? 0}</p>
          </div>
          <div>
            <p className="pc-label">Locked At</p>
            <p className="pc-trend">{currentRun?.lockedAt ? new Date(currentRun.lockedAt).toLocaleString() : "Not locked"}</p>
          </div>
        </div>

        <div className="pc-table-wrap">
          <table className="pc-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Gross (TZS)</th>
                <th>Deductions (TZS)</th>
                <th>Net (TZS)</th>
                <th>Proration</th>
                <th>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {currentRun?.items.length ? (
                currentRun.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.employeeName}
                      {item.employeeNo ? <span className="pc-muted"> ({item.employeeNo})</span> : null}
                    </td>
                    <td>{formatAmount(item.grossPay)}</td>
                    <td>{formatAmount(item.totalDeductions)}</td>
                    <td className="pc-net">{formatAmount(item.netPay)}</td>
                    <td>{formatProration(item.calcSnapshot.prorationFactor)}</td>
                    <td>
                      {(item.calcSnapshot.warnings ?? []).length > 0 ? (
                        <span className="pc-chip pending">{(item.calcSnapshot.warnings ?? []).length} warning(s)</span>
                      ) : (
                        <span className="pc-muted">None</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="pc-muted">
                    No payroll items loaded.
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

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 2 }).format(value);
}

function formatProration(value: number | undefined) {
  if (value === undefined) {
    return "1.0000";
  }
  return value.toFixed(4);
}

function chipClass(status: PayrollRunStatus | undefined) {
  if (!status) {
    return "pending";
  }

  if (status === "paid") {
    return "ok";
  }

  if (status === "locked" || status === "approved" || status === "validated") {
    return "pending";
  }

  return "warn";
}
