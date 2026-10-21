import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { findingsFor, parseBoard, summarize } from "../src/missions.ts";

const board = parseBoard(JSON.parse(readFileSync(new URL("../data/missions.json", import.meta.url), "utf8")));
const missions = board.missions.map((mission) => ({
  ...mission,
  findings: findingsFor(mission, board),
}));
const snapshot = { synthetic: true, snapshotSol: board.snapshotSol, summary: summarize(board), missions };
const fingerprint = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16);
console.log(JSON.stringify({ ...snapshot, fingerprint }, null, 2));
