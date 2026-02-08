"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "./role-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/payroll", label: "Payroll" },
  { href: "/leave", label: "Leave" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

const companies = ["Mtoni Logistics Ltd", "Chap Retail Group", "Hekima Clinic"];

type AppShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function AppShell({ title, subtitle, children, action }: AppShellProps) {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  return (
    <div className="pc-app-bg">
      <div className="pc-glow pc-glow-a" />
      <div className="pc-glow pc-glow-b" />
      <div className="pc-shell">
        <aside className="pc-sidebar">
          <div className="pc-brand">
            <p>Payroll Chap</p>
            <span>Tanzania SME Suite</span>
          </div>

          <nav className="pc-nav">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={isActive ? "pc-nav-link active" : "pc-nav-link"}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="pc-side-foot">
            <p>Security</p>
            <span>RLS-ready tenant isolation</span>
          </div>
        </aside>

        <main className="pc-main">
          <header className="pc-topbar">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="pc-topbar-controls">
              <select aria-label="Company" defaultValue={companies[0]}>
                {companies.map((company) => (
                  <option key={company}>{company}</option>
                ))}
              </select>
              <select
                aria-label="Role"
                value={role}
                onChange={(event) => setRole(event.target.value as typeof role)}
              >
                <option value="owner">Owner</option>
                <option value="admin">HR/Admin</option>
                <option value="accountant">Accountant</option>
                <option value="employee">Employee</option>
              </select>
              <form action="/auth/sign-out" method="post">
                <button type="submit" className="pc-button ghost">
                  Sign out
                </button>
              </form>
              {action}
            </div>
          </header>

          <section className="pc-content">{children}</section>
        </main>
      </div>
    </div>
  );
}
