import { ok } from "@/lib/http";

export async function GET() {
  return ok({
    status: "ok",
    service: "payroll-chap-ui",
    timestamp: new Date().toISOString(),
  });
}
