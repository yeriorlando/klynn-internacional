import assert from "node:assert/strict";
import test from "node:test";
import {
  createOfflineAuthVerifier,
  isOfflineAuthExpired,
  recordOfflineAuthFailure,
  verifyOfflinePassword,
} from "./offline-auth.ts";
import { compactOutboxOperation, type SyncOutboxItem } from "./offline-db.ts";
import { computeNextOrderSequence, extractOrderSequenceNumber } from "./order-sequence.ts";

function queued(
  action: SyncOutboxItem["action"],
  payload: Record<string, unknown>,
): SyncOutboxItem {
  return {
    id: "operation-1",
    entity_id: "order-1",
    tenant_id: "tenant-1",
    table_name: "ordenes",
    action,
    payload,
    timestamp: "2026-08-23T00:00:00.000Z",
    attempts: 0,
    status: "pending",
  };
}

test("an UPDATE never replaces the UPSERT that creates an offline order", () => {
  const result = compactOutboxOperation(
    queued("UPSERT", { id: "order-1", numero: "KL-1", total: 500, estado: "RECIBIDA" }),
    {
      tenant_id: "tenant-1",
      table_name: "ordenes",
      action: "UPDATE",
      payload: { estado: "EN_PROCESO" },
    },
  );
  assert.equal(result.action, "UPSERT");
  assert.deepEqual(result.payload, {
    id: "order-1",
    numero: "KL-1",
    total: 500,
    estado: "EN_PROCESO",
  });
});

test("a DELETE supersedes pending writes without losing the entity id", () => {
  const result = compactOutboxOperation(queued("UPSERT", { id: "order-1", total: 500 }), {
    tenant_id: "tenant-1",
    table_name: "ordenes",
    action: "DELETE",
    payload: { id: "order-1" },
  });
  assert.equal(result.action, "DELETE");
  assert.deepEqual(result.payload, { id: "order-1" });
});

test("offline password verifiers accept only the original password", async () => {
  const verifier = await createOfflineAuthVerifier("correct horse battery staple");
  assert.equal(await verifyOfflinePassword("correct horse battery staple", verifier), true);
  assert.equal(await verifyOfflinePassword("wrong password", verifier), false);
  assert.equal(isOfflineAuthExpired(verifier), false);
});

test("five failed offline logins create a temporary lock", async () => {
  let verifier = await createOfflineAuthVerifier("secret");
  for (let attempt = 0; attempt < 5; attempt++) verifier = recordOfflineAuthFailure(verifier);
  assert.ok(verifier.locked_until);
  assert.equal(await verifyOfflinePassword("secret", verifier), false);
});

test("duplicate copies of one anomalous order do not drag the sequence forward", () => {
  assert.equal(computeNextOrderSequence([232, 233, 234, 8139, 8139, 8139]), 235);
});

test("a small anomalous cluster does not replace the established tenant sequence", () => {
  assert.equal(computeNextOrderSequence([230, 231, 232, 233, 234, 8139, 8140, 8141]), 235);
});

test("order sequences are read only from the requested month", () => {
  assert.equal(extractOrderSequenceNumber("KL-202608-0234", "202608"), 234);
  assert.equal(extractOrderSequenceNumber("KL-202607-9999", "202608"), null);
});
