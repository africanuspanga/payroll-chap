import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { StatCard } from "@/components/stat-card";
import { RedOpsAlerts } from "@/components/red-ops-alerts";

const alerts = [
  "7 contracts expire within 45 days",
  "2 leave requests pending approval",
  "Payroll draft for February 2026 is open",
  "1 employee has missing bank/mobile money details",
];

export default function DashboardPage() {
  return (
    <AppShell
      title="Operations Dashboard"
      subtitle="Live snapshot for payroll, workforce, and leave operations"
      action={<button className="pc-button">Run Monthly Payroll</button>}
    >
      <div className="pc-grid pc-grid-4">
        <StatCard label="Active Employees" value="138" trend="+9 this quarter" />
        <StatCard label="February Gross Payroll" value="TZS 94.2M" trend="2.8% vs January" />
        <StatCard label="Pending Leaves" value="12" trend="5 need manager action" />
        <StatCard label="Net Pay Prepared" value="TZS 76.4M" trend="Draft, not finalized" />
      </div>

      <div className="pc-grid pc-grid-2">
        <article className="pc-card pc-animate">
          <h3>Payroll Timeline</h3>
          <ol className="pc-timeline">
            <li>
              <span>Step 1</span>
              <p>Freeze attendance and leave by Feb 25</p>
            </li>
            <li>
              <span>Step 2</span>
              <p>Generate draft payroll and validate deductions</p>
            </li>
            <li>
              <span>Step 3</span>
              <p>Approve and lock payroll before month-end</p>
            </li>
            <li>
              <span>Step 4</span>
              <p>Release payslips and audit logs</p>
            </li>
          </ol>
        </article>

        <article className="pc-card pc-animate">
          <h3>Operational Alerts</h3>
          <ul className="pc-list">
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </article>
      </div>

      <RoleGate permission="viewReports">
        <RedOpsAlerts />
      </RoleGate>

      <RoleGate
        permission="viewReports"
        fallback={
          <article className="pc-card pc-animate">
            <h3>Role-Limited View</h3>
            <p>You are viewing the employee self-service scope. Financial reports are hidden for this role.</p>
          </article>
        }
      >
        <article className="pc-card pc-animate">
          <h3>Monthly Cost Mix</h3>
          <div className="pc-bars">
            <div>
              <label>Salaries</label>
              <span style={{ width: "72%" }} />
            </div>
            <div>
              <label>Allowances</label>
              <span style={{ width: "18%" }} />
            </div>
            <div>
              <label>Deductions</label>
              <span style={{ width: "10%" }} />
            </div>
          </div>
        </article>
      </RoleGate>
    </AppShell>
  );
}
