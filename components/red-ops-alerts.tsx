"use client";

import { useEffect, useState } from "react";

type RedFlag = {
  code: string;
  label: string;
  count: number;
};

type OpsPayload = {
  hasRedFlags: boolean;
  redFlags: RedFlag[];
  generatedAt: string;
};

export function RedOpsAlerts() {
  const [data, setData] = useState<OpsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/v1/ops/red-dashboard", { cache: "no-store" });
        const payload = (await response.json()) as {
          data?: OpsPayload;
          error?: { message?: string };
        };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "Failed to load operations health");
        }

        if (!cancelled) {
          setData(payload.data);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load operations health");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <article className="pc-card pc-animate" style={{ borderColor: "#fecaca", background: "#fff1f2" }}>
        <h3>Operational Health</h3>
        <p className="pc-trend" style={{ color: "#9f1239" }}>
          {error}
        </p>
      </article>
    );
  }

  if (!data) {
    return (
      <article className="pc-card pc-animate">
        <h3>Operational Health</h3>
        <p className="pc-muted">Loading current platform risk signals...</p>
      </article>
    );
  }

  const activeFlags = data.redFlags.filter((flag) => flag.count > 0);

  if (!activeFlags.length) {
    return (
      <article className="pc-card pc-animate" style={{ borderColor: "#99f6e4", background: "#f0fdfa" }}>
        <h3>Operational Health</h3>
        <p className="pc-trend" style={{ color: "#115e59" }}>
          All clear. No red alerts from imports, filings, notifications, or recent API errors.
        </p>
      </article>
    );
  }

  return (
    <article className="pc-card pc-animate" style={{ borderColor: "#fecaca", background: "#fff1f2" }}>
      <h3>Red Dashboard</h3>
      <p className="pc-trend" style={{ color: "#9f1239" }}>
        Immediate operational attention required.
      </p>
      <ul className="pc-list">
        {activeFlags.map((flag) => (
          <li key={flag.code}>
            {flag.label}: {flag.count}
          </li>
        ))}
      </ul>
    </article>
  );
}
