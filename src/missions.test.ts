import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { findingsFor, parseBoard, selectMissions, summarize } from "./missions.ts";
import type { Mission, MissionBoard } from "./missions.ts";

const raw: unknown = JSON.parse(readFileSync(new URL("../data/missions.json", import.meta.url), "utf8"));
const board = parseBoard(raw);
const healthy = board.missions[0]!;
function withMission(changes: Partial<Mission>): [Mission, MissionBoard] {
  const mission = { ...healthy, ...changes };
  return [mission, { ...board, missions: [mission] }];
}

test("synthetic fixture has healthy and actionable cases with exact counts", () => {
  assert.deepEqual(summarize(board), { total: 8, active: 6, landed: 2, needsAttention: 4 });
  assert.deepEqual(findingsFor(healthy, board), []);
  assert.deepEqual(findingsFor(board.missions[1]!, board).map((finding) => finding.code),
    ["blocked", "overdue", "stale", "dependency"]);
});

test("due today and seven sols without an update are not overdue or stale", () => {
  const [mission, context] = withMission({ dueSol: 42, updatedSol: 35 });
  assert.deepEqual(findingsFor(mission, context), []);
});

test("one sol overdue and eight sols stale cross the exact thresholds", () => {
  const [mission, context] = withMission({ dueSol: 41, updatedSol: 34 });
  assert.deepEqual(findingsFor(mission, context).map((finding) => finding.code), ["overdue", "stale"]);
});

test("completed missions do not raise historical overdue or stale alerts", () => {
  const [mission, context] = withMission({ status: "landed", progress: 100, dueSol: 1, updatedSol: 1, owner: null });
  assert.deepEqual(findingsFor(mission, context), []);
});

test("unowned ready missions need attention", () => {
  const [mission, context] = withMission({ status: "ready", owner: null });
  assert.deepEqual(findingsFor(mission, context).map((finding) => finding.code), ["unowned"]);
});

test("landed dependencies no longer block a mission", () => {
  const mission = { ...healthy, dependencies: ["ORB-104"] };
  assert.deepEqual(findingsFor(mission, board), []);
});

test("search covers IDs, owners, destinations and tags, ignoring case and edge spaces", () => {
  assert.equal(selectMissions(board, " orb-102 ", false)[0]?.id, "ORB-102");
  assert.equal(selectMissions(board, "MONA", false).length, 2);
  assert.equal(selectMissions(board, "Mallow", false).length, 1);
  assert.equal(selectMissions(board, "good first orbit", false).length, 2);
  assert.equal(selectMissions(board, "unassigned", false).length, 1);
});

test("attention filter composes with search and supports empty results", () => {
  assert.equal(selectMissions(board, "", true).length, 4);
  assert.equal(selectMissions(board, "basil", true).length, 0);
  assert.equal(selectMissions(board, "no such mission", false).length, 0);
});

test("invalid fixtures fail explicitly rather than producing a healthy report", () => {
  assert.throws(() => parseBoard({}), /Invalid mission fixture/);
  assert.throws(() => parseBoard({ ...board, synthetic: false }), /synthetic board/);
  for (const change of [
    { progress: 101 }, { status: "missing" }, { dueSol: -1 }, { owner: "" }, { priority: ["normal"] },
    { updatedSol: 43 }, { dependencies: ["UNKNOWN"] }, { dependencies: [healthy.id] },
    { status: "landed", progress: 80 },
  ]) {
    assert.throws(() => parseBoard({ ...board, missions: [{ ...healthy, ...change }] }), /Invalid mission fixture/);
  }
  assert.throws(() => parseBoard({ ...board, missions: [healthy, healthy] }), /duplicate/);
});

test("all-healthy and empty boards have no actionable findings", () => {
  const context = { ...board, missions: [healthy] };
  assert.equal(summarize(context).needsAttention, 0);
  assert.deepEqual(summarize({ ...board, missions: [] }), { total: 0, active: 0, landed: 0, needsAttention: 0 });
});

test("health CLI emits deterministic JSON with a verifiable snapshot fingerprint", () => {
  const script = new URL("../scripts/mission-health.ts", import.meta.url);
  const first = execFileSync(process.execPath, [fileURLToPath(script)], { encoding: "utf8" });
  const second = execFileSync(process.execPath, [fileURLToPath(script)], { encoding: "utf8" });
  assert.equal(first, second);
  const { fingerprint, ...snapshot } = JSON.parse(first);
  assert.equal(snapshot.synthetic, true);
  assert.equal(snapshot.snapshotSol, 42);
  assert.deepEqual(snapshot.summary, summarize(board));
  assert.equal(snapshot.missions.filter((mission: { findings: unknown[] }) => mission.findings.length > 0).length, 4);
  assert.match(fingerprint, /^[0-9a-f]{16}$/);
  assert.equal(fingerprint, createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16));
});
