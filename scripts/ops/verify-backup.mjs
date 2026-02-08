import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function fail(message, details) {
  console.error(
    JSON.stringify({
      level: "error",
      category: "backup_verification",
      message,
      details: details ?? null,
      checkedAt: new Date().toISOString(),
    }),
  );
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
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

const backupDir = resolve(process.env.BACKUP_DIR ?? join(process.cwd(), "artifacts", "backups"));
const minimumBytes = Number(process.env.BACKUP_MIN_BYTES ?? "5000");
const requiredTables = (process.env.BACKUP_REQUIRED_TABLES ?? "companies,employees,payroll_runs,filing_returns")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!Number.isFinite(minimumBytes) || minimumBytes <= 0) {
  fail("BACKUP_MIN_BYTES must be a positive number", { minimumBytes: process.env.BACKUP_MIN_BYTES });
}

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const backupFile = join(backupDir, `public-${timestamp}.sql`);

mkdirSync(backupDir, { recursive: true });

run("supabase", ["db", "dump", "--linked", "--schema", "public", "--file", backupFile]);

const sizeBytes = statSync(backupFile).size;
if (sizeBytes < minimumBytes) {
  fail("Backup file is too small", {
    backupFile,
    sizeBytes,
    minimumBytes,
  });
}

const content = readFileSync(backupFile, "utf8");
const missingMarkers = requiredTables.filter((table) => {
  const marker = `public.${table}`;
  return !content.includes(marker);
});

if (missingMarkers.length) {
  fail("Backup missing required public table markers", {
    backupFile,
    missingMarkers,
  });
}

const sha256 = createHash("sha256").update(content).digest("hex");
const manifest = {
  level: "info",
  category: "backup_verification",
  message: "Supabase backup verification passed",
  checkedAt: new Date().toISOString(),
  backupFile,
  sizeBytes,
  sha256,
  requiredTables,
};

const manifestFile = join(backupDir, `manifest-${timestamp}.json`);
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

console.log(JSON.stringify({ ...manifest, manifestFile }));
