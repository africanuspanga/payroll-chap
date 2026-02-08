"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";

type PayrollSummaryRow = {
  payrollRunId: string;
  periodYear: number | null;
  periodMonth: number | null;
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  createdAt: string;
};

type FilingRow = {
  id: string;
  filingType: string;
  periodYear: number | null;
  periodMonth: number | null;
  dueDate: string;
  status: "draft" | "ready" | "submitted" | "paid" | "amended";
  amountDue: number;
  penaltyAmount: number;
  suggestedPenalty: number;
  lateDays: number;
  submissionReference: string | null;
  paymentReference: string | null;
  originalFilingId: string | null;
};

type ComplianceDeadline = {
  source: "filing" | "reminder";
  id: string;
  title: string;
  dueDate: string;
  status: string;
  severity: "overdue" | "due_soon" | "upcoming";
};

type SupportSlaPayload = {
  hasBreaches: boolean;
  breaches: Array<{
    code: string;
    label: string;
    count: number;
  }>;
  targetHours: number;
};

type RetentionHealthPreview = {
  snapshot: {
    healthScore: number;
    companyName: string;
    activeEmployees: number;
    filings: {
      dueSoonCount: number;
      overdueCount: number;
    };
    operations: {
      failedImports7d: number;
      failedNotifications7d: number;
      criticalErrors7d: number;
      pendingLeaveRequests: number;
    };
  };
  quarterReviewDueDate: string;
};

export default function ReportsPage() {
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummaryRow[]>([]);
  const [filings, setFilings] = useState<FilingRow[]>([]);
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>([]);
  const [supportSla, setSupportSla] = useState<SupportSlaPayload | null>(null);
  const [retentionPreview, setRetentionPreview] = useState<RetentionHealthPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQueueingHealthReport, setIsQueueingHealthReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [summaryResponse, filingsResponse, deadlinesResponse, supportSlaResponse, retentionPreviewResponse] =
        await Promise.all([
        fetch("/api/v1/reports/payroll-summary", { cache: "no-store" }),
        fetch("/api/v1/filings", { cache: "no-store" }),
        fetch("/api/v1/compliance/deadlines?horizonDays=30", { cache: "no-store" }),
        fetch("/api/v1/ops/support-sla", { cache: "no-store" }),
        fetch("/api/v1/retention/payroll-health", { cache: "no-store" }),
      ]);

      const summaryPayload = (await summaryResponse.json()) as {
        data?: PayrollSummaryRow[];
        error?: { message?: string };
      };

      const filingsPayload = (await filingsResponse.json()) as {
        data?: FilingRow[];
        error?: { message?: string };
      };
      const deadlinesPayload = (await deadlinesResponse.json()) as {
        data?: { items?: ComplianceDeadline[] };
        error?: { message?: string };
      };
      const supportSlaPayload = (await supportSlaResponse.json()) as {
        data?: SupportSlaPayload;
        error?: { message?: string };
      };
      const retentionPreviewPayload = (await retentionPreviewResponse.json()) as {
        data?: RetentionHealthPreview;
        error?: { message?: string };
      };

      if (!summaryResponse.ok || !summaryPayload.data) {
        throw new Error(summaryPayload.error?.message ?? "Failed to load payroll summary");
      }

      if (!filingsResponse.ok || !filingsPayload.data) {
        throw new Error(filingsPayload.error?.message ?? "Failed to load filings");
      }

      setPayrollSummary(summaryPayload.data);
      setFilings(filingsPayload.data);
      setDeadlines(deadlinesPayload.data?.items ?? []);
      setSupportSla(supportSlaPayload.data ?? null);
      setRetentionPreview(retentionPreviewPayload.data ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function generateFilings() {
    setIsGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/filings/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const payload = (await response.json()) as {
        data?: unknown[];
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to generate filings");
      }

      setMessage(`Generated ${payload.data?.length ?? 0} filing records.`);
      await loadData();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Failed to generate filings");
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateFilingStatus(filingId: string, targetStatus: "submitted" | "paid") {
    setError(null);
    setMessage(null);

    const referencePrompt =
      targetStatus === "submitted"
        ? "Enter submission reference (optional)"
        : "Enter payment reference (optional)";

    const reference = window.prompt(referencePrompt) ?? "";

    try {
      const response = await fetch(`/api/v1/filings/${filingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetStatus,
          submissionReference: targetStatus === "submitted" ? reference : undefined,
          paymentReference: targetStatus === "paid" ? reference : undefined,
        }),
      });

      const payload = (await response.json()) as {
        data?: unknown;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? `Failed to mark filing as ${targetStatus}`);
      }

      setMessage(`Filing updated to ${targetStatus}.`);
      await loadData();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update filing");
    }
  }

  async function amendFiling(filing: FilingRow) {
    const amountInput = window.prompt("Enter amended amount due", String(filing.amountDue));
    if (!amountInput) {
      return;
    }

    const reason = window.prompt("Enter amendment reason");
    if (!reason) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/filings/${filing.id}/amend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountDue: Number(amountInput),
          reason,
        }),
      });

      const payload = (await response.json()) as {
        data?: { amendedFilingId?: string };
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to create amendment");
      }

      setMessage(`Amended filing created (${payload.data?.amendedFilingId ?? "n/a"}).`);
      await loadData();
    } catch (amendError) {
      setError(amendError instanceof Error ? amendError.message : "Failed to amend filing");
    }
  }

  async function queueWeeklyHealthReport() {
    setIsQueueingHealthReport(true);
    setError(null);
    setMessage(null);

    const emailRecipient = (window.prompt("Owner email for weekly payroll health report (optional)") ?? "").trim();
    const whatsappRecipient = (window.prompt("Owner WhatsApp number for weekly report (optional)") ?? "").trim();

    const recipients = [
      emailRecipient ? { channel: "email", recipient: emailRecipient } : null,
      whatsappRecipient ? { channel: "whatsapp", recipient: whatsappRecipient } : null,
    ].filter((value): value is { channel: string; recipient: string } => Boolean(value));

    try {
      const response = await fetch("/api/v1/retention/payroll-health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `weekly-health-${Date.now()}`,
        },
        body: JSON.stringify({
          recipients,
        }),
      });

      const payload = (await response.json()) as {
        data?: { queuedCount?: number; quarterReviewDueDate?: string; healthScore?: number };
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to queue weekly health report");
      }

      setMessage(
        `Weekly payroll health report queued (${payload.data?.queuedCount ?? 0} notifications). Quarterly review due ${payload.data?.quarterReviewDueDate ?? "n/a"}.`,
      );
      await loadData();
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : "Failed to queue weekly health report");
    } finally {
      setIsQueueingHealthReport(false);
    }
  }

  return (
    <AppShell
      title="Reports"
      subtitle="Payroll analytics, filing packs, submissions, and amendments"
      action={
        <div className="pc-toolbar" style={{ marginBottom: 0 }}>
          <button className="pc-button ghost" onClick={loadData} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="pc-button" onClick={generateFilings} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Filing Pack"}
          </button>
          <button className="pc-button ghost" onClick={queueWeeklyHealthReport} disabled={isQueueingHealthReport}>
            {isQueueingHealthReport ? "Queueing..." : "Queue Weekly Health Report"}
          </button>
        </div>
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

      <RoleGate
        permission="viewReports"
        fallback={
          <article className="pc-card pc-animate">
            <h3>Reports Restricted</h3>
            <p>This role cannot access company-level payroll reports.</p>
          </article>
        }
      >
        <div className="pc-grid pc-grid-3">
          <article className="pc-card pc-animate">
            <h3>Compliance Deadlines</h3>
            <p className="pc-muted">
              Overdue: {deadlines.filter((item) => item.severity === "overdue").length} | Due in 7 days:{" "}
              {deadlines.filter((item) => item.severity === "due_soon").length}
            </p>
            <ul className="pc-list">
              {deadlines.slice(0, 5).map((item) => (
                <li key={`${item.source}-${item.id}`}>
                  {item.title} ({item.dueDate}) - {item.severity.replace("_", " ")}
                </li>
              ))}
              {!deadlines.length ? <li className="pc-muted">No active reminders in horizon.</li> : null}
            </ul>
          </article>

          <article className="pc-card pc-animate">
            <h3>Support SLA (24h)</h3>
            <p className={`pc-trend ${supportSla?.hasBreaches ? "" : "up"}`}>
              {supportSla?.hasBreaches ? "Breaches detected" : "Within SLA"}
            </p>
            <ul className="pc-list">
              {(supportSla?.breaches ?? []).map((breach) => (
                <li key={breach.code}>
                  {breach.label}: {breach.count}
                </li>
              ))}
            </ul>
          </article>

          <article className="pc-card pc-animate">
            <h3>Retention Snapshot</h3>
            <p className="pc-muted">{retentionPreview?.snapshot.companyName ?? "Company"} weekly health score</p>
            <p className="pc-trend">Score: {retentionPreview?.snapshot.healthScore ?? "n/a"}/100</p>
            <ul className="pc-list">
              <li>Active employees: {retentionPreview?.snapshot.activeEmployees ?? 0}</li>
              <li>Overdue filings: {retentionPreview?.snapshot.filings.overdueCount ?? 0}</li>
              <li>Failed imports (7d): {retentionPreview?.snapshot.operations.failedImports7d ?? 0}</li>
            </ul>
            <p className="pc-muted">Quarterly review due: {retentionPreview?.quarterReviewDueDate ?? "n/a"}</p>
          </article>
        </div>

        <article className="pc-card pc-animate">
          <h3>Payroll Summary (Recent Runs)</h3>
          <div className="pc-table-wrap">
            <table className="pc-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Gross (TZS)</th>
                  <th>Deductions (TZS)</th>
                  <th>Net (TZS)</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {payrollSummary.length ? (
                  payrollSummary.map((row) => (
                    <tr key={row.payrollRunId}>
                      <td>
                        {row.periodYear}-{String(row.periodMonth ?? 0).padStart(2, "0")}
                      </td>
                      <td>{formatAmount(row.grossTotal)}</td>
                      <td>{formatAmount(row.deductionTotal)}</td>
                      <td className="pc-net">{formatAmount(row.netTotal)}</td>
                      <td>{new Date(row.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="pc-muted">
                      No payroll runs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="pc-card pc-animate">
          <h3>Statutory Filing Tracker</h3>
          <div className="pc-table-wrap">
            <table className="pc-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Period</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Penalty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filings.length ? (
                  filings.map((filing) => (
                    <tr key={filing.id}>
                      <td>
                        {filing.filingType}
                        {filing.originalFilingId ? <span className="pc-muted"> (Amended)</span> : null}
                      </td>
                      <td>
                        {filing.periodYear}-{String(filing.periodMonth ?? 0).padStart(2, "0")}
                      </td>
                      <td>{filing.dueDate}</td>
                      <td>{formatAmount(filing.amountDue)}</td>
                      <td>
                        {formatAmount(filing.penaltyAmount)}
                        {filing.suggestedPenalty > filing.penaltyAmount ? (
                          <span className="pc-muted"> (suggested {formatAmount(filing.suggestedPenalty)})</span>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={`pc-chip ${
                            filing.status === "paid"
                              ? "ok"
                              : filing.status === "submitted"
                                ? "pending"
                                : filing.status === "amended"
                                  ? "warn"
                                  : "pending"
                          }`}
                        >
                          {filing.status}
                        </span>
                      </td>
                      <td>
                        {filing.status === "ready" ? (
                          <>
                            <button className="pc-text-btn" onClick={() => updateFilingStatus(filing.id, "submitted")}>
                              Mark Submitted
                            </button>
                            <button className="pc-text-btn" onClick={() => amendFiling(filing)}>
                              Amend
                            </button>
                          </>
                        ) : null}
                        {filing.status === "submitted" ? (
                          <button className="pc-text-btn" onClick={() => updateFilingStatus(filing.id, "paid")}>
                            Mark Paid
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="pc-muted">
                      No filings yet. Generate filing pack from latest payroll run.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </RoleGate>
    </AppShell>
  );
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 2 }).format(value);
}
