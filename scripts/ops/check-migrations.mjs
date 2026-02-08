import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"));

const errors = [];

if (!migrationFiles.length) {
  errors.push("No migration files found.");
}

const sorted = [...migrationFiles].sort((a, b) => a.localeCompare(b));
for (let index = 0; index < migrationFiles.length; index += 1) {
  if (migrationFiles[index] !== sorted[index]) {
    errors.push("Migration files are not lexicographically ordered.");
    break;
  }
}

const seenTimestamps = new Set();
for (const file of sorted) {
  const match = file.match(/^(\d{14})_.+\.sql$/);
  if (!match) {
    errors.push(`Invalid migration filename format: ${file}`);
    continue;
  }

  const stamp = match[1];
  if (seenTimestamps.has(stamp)) {
    errors.push(`Duplicate migration timestamp: ${stamp}`);
  }
  seenTimestamps.add(stamp);

  const fullPath = join(migrationsDir, file);
  if (statSync(fullPath).size === 0) {
    errors.push(`Migration file is empty: ${file}`);
    continue;
  }

  const content = readFileSync(fullPath, "utf8").trim();
  if (!content) {
    errors.push(`Migration file has no SQL content: ${file}`);
  }
}

if (errors.length) {
  console.error(
    JSON.stringify({
      level: "error",
      category: "migration_failure",
      message: "Migration validation failed",
      errors,
      checkedAt: new Date().toISOString(),
    }),
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    level: "info",
    category: "migration_check",
    message: "Migration validation passed",
    migrationCount: sorted.length,
    checkedAt: new Date().toISOString(),
  }),
);
