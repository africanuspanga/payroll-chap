import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function fail(message, details) {
  console.error(
    JSON.stringify({
      level: "error",
      category: "restore_drill",
      message,
      details: details ?? null,
      checkedAt: new Date().toISOString(),
    }),
  );
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });

  if (result.error) {
    fail(`Failed to run command: ${command}`, result.error.message);
  }

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`, {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  return result;
}

function resolveBackupFile() {
  const explicit = process.env.BACKUP_FILE;
  if (explicit) {
    return resolve(explicit);
  }

  const backupDir = resolve(process.env.BACKUP_DIR ?? join(process.cwd(), "artifacts", "backups"));
  const files = readdirSync(backupDir)
    .filter((name) => name.startsWith("public-") && name.endsWith(".sql"))
    .sort((a, b) => b.localeCompare(a));

  if (!files.length) {
    fail("No backup SQL files found for restore drill", { backupDir });
  }

  return join(backupDir, files[0]);
}

const restoreDbUrl = process.env.RESTORE_DB_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";
const requiredTables = (process.env.RESTORE_REQUIRED_TABLES ?? "companies,employees,payroll_periods,payroll_runs,filing_returns")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!requiredTables.length) {
  fail("RESTORE_REQUIRED_TABLES resolved to an empty list");
}

let adminUrl;
try {
  adminUrl = new URL(restoreDbUrl);
} catch (error) {
  fail("Invalid RESTORE_DB_URL", error instanceof Error ? error.message : String(error));
}

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const drillDbName = `restore_drill_${timestamp}`;
const backupFile = resolveBackupFile();
const drillUrl = new URL(adminUrl.toString());
drillUrl.pathname = `/${drillDbName}`;

try {
  run("psql", [adminUrl.toString(), "-v", "ON_ERROR_STOP=1", "-c", `create database \"${drillDbName}\"`]);

  run("psql", [
    drillUrl.toString(),
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "create schema if not exists auth; create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;",
  ]);

  run("psql", [drillUrl.toString(), "-v", "ON_ERROR_STOP=1", "-f", backupFile]);

  const tableArraySql = requiredTables.map((table) => `'${table}'`).join(", ");
  const checkResult = run("psql", [
    drillUrl.toString(),
    "-tA",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `select count(*) from information_schema.tables where table_schema='public' and table_name in (${tableArraySql});`,
  ]);

  const matchedTables = Number(checkResult.stdout.trim());
  if (!Number.isFinite(matchedTables) || matchedTables < requiredTables.length) {
    fail("Restore drill completed but required tables are missing", {
      matchedTables,
      requiredTableCount: requiredTables.length,
      requiredTables,
      backupFile,
      drillDbName,
    });
  }

  const report = {
    level: "info",
    category: "restore_drill",
    message: "Restore drill succeeded",
    checkedAt: new Date().toISOString(),
    backupFile,
    drillDbName,
    matchedTables,
    requiredTables,
  };

  const reportDir = process.env.BACKUP_DIR ?? join(process.cwd(), "artifacts", "backups");
  mkdirSync(reportDir, { recursive: true });
  const reportFile = join(reportDir, `restore-drill-${timestamp}.json`);
  writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ ...report, reportFile }));
} finally {
  const dropResult = spawnSync(
    "psql",
    [adminUrl.toString(), "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists \"${drillDbName}\" with (force)`],
    { encoding: "utf8" },
  );

  if (dropResult.status !== 0) {
    console.error(
      JSON.stringify({
        level: "warn",
        category: "restore_drill",
        message: "Failed to drop restore drill database",
        details: {
          drillDbName,
          status: dropResult.status,
          stderr: dropResult.stderr,
        },
        checkedAt: new Date().toISOString(),
      }),
    );
  }
}
