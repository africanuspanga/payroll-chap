import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";

export default function SettingsPage() {
  return (
    <AppShell
      title="Company Settings"
      subtitle="Multi-company controls, permissions, and payroll defaults"
      action={<button className="pc-button">Save Changes</button>}
    >
      <RoleGate
        permission="manageSettings"
        fallback={
          <article className="pc-card pc-animate">
            <h3>Restricted Area</h3>
            <p>Only owner-level users can change company settings and permission policy.</p>
          </article>
        }
      >
        <div className="pc-grid pc-grid-2">
          <article className="pc-card pc-animate">
            <h3>Company Profile</h3>
            <div className="pc-form-grid">
              <label>
                Legal Name
                <input defaultValue="Mtoni Logistics Ltd" />
              </label>
              <label>
                Country
                <input defaultValue="Tanzania" />
              </label>
              <label>
                Currency
                <input defaultValue="TZS" />
              </label>
              <label>
                Payroll Day
                <input defaultValue="28" />
              </label>
            </div>
          </article>

          <article className="pc-card pc-animate">
            <h3>Role Access Matrix</h3>
            <ul className="pc-list">
              <li>Owner: Full access, including settings and billing</li>
              <li>HR/Admin: Employee and leave management, payroll execution</li>
              <li>Accountant: Payroll validation, reports, payslip release</li>
              <li>Employee: Self-service profile, leave requests, payslip history</li>
            </ul>
          </article>
        </div>
      </RoleGate>
    </AppShell>
  );
}
