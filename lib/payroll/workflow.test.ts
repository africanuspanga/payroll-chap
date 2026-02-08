import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPayrollRunTransition,
  canTransitionPayrollRunStatus,
} from "./workflow";

test("canTransitionPayrollRunStatus allows forward progression", () => {
  assert.equal(canTransitionPayrollRunStatus("draft", "validated"), true);
  assert.equal(canTransitionPayrollRunStatus("validated", "approved"), true);
  assert.equal(canTransitionPayrollRunStatus("approved", "locked"), true);
  assert.equal(canTransitionPayrollRunStatus("locked", "paid"), true);
});

test("assertPayrollRunTransition rejects invalid jumps", () => {
  assert.throws(() => assertPayrollRunTransition("draft", "approved"));
  assert.throws(() => assertPayrollRunTransition("paid", "locked"));
});
