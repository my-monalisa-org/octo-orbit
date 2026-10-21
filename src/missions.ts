export const statuses = ["ready", "in-flight", "blocked", "landed"] as const;
export type Status = (typeof statuses)[number];
export type Priority = "critical" | "high" | "normal";

export interface Mission {
  id: string;
  title: string;
  summary: string;
  status: Status;
  priority: Priority;
  owner: string | null;
  destination: string;
  progress: number;
  dueSol: number;
  updatedSol: number;
  tags: string[];
  dependencies: string[];
  nextStep: string;
}

export interface MissionBoard {
  synthetic: true;
  snapshotSol: number;
  season: string;
  missions: Mission[];
}

export interface Finding {
  code: "blocked" | "overdue" | "unowned" | "stale" | "dependency";
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSol(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText);
}

function isMission(value: unknown): value is Mission {
  if (!isRecord(value)) return false;
  return (
    ["id", "title", "summary", "destination", "nextStep"].every((key) => isText(value[key])) &&
    statuses.some((status) => status === value.status) &&
    typeof value.priority === "string" && ["critical", "high", "normal"].includes(value.priority) &&
    (value.owner === null || isText(value.owner)) &&
    typeof value.progress === "number" &&
    Number.isInteger(value.progress) && value.progress >= 0 && value.progress <= 100 &&
    isSol(value.dueSol) && isSol(value.updatedSol) &&
    isTextArray(value.tags) && isTextArray(value.dependencies) &&
    (value.status !== "landed" || value.progress === 100)
  );
}

export function parseBoard(value: unknown): MissionBoard {
  if (
    !isRecord(value) || value.synthetic !== true ||
    !isSol(value.snapshotSol) || !isText(value.season) ||
    !Array.isArray(value.missions) || !value.missions.every(isMission)
  ) {
    throw new Error("Invalid mission fixture: expected a synthetic board with valid mission fields.");
  }
  const ids = new Set(value.missions.map((mission) => mission.id));
  if (ids.size !== value.missions.length) throw new Error("Invalid mission fixture: duplicate mission IDs.");
  for (const mission of value.missions) {
    if (mission.updatedSol > value.snapshotSol) {
      throw new Error(`Invalid mission fixture: ${mission.id} was updated after the snapshot.`);
    }
    if (mission.dependencies.some((id) => !ids.has(id) || id === mission.id)) {
      throw new Error(`Invalid mission fixture: ${mission.id} has an unknown or self dependency.`);
    }
  }
  return {
    synthetic: true,
    snapshotSol: value.snapshotSol,
    season: value.season,
    missions: value.missions,
  };
}

export function findingsFor(mission: Mission, board: MissionBoard): Finding[] {
  if (mission.status === "landed") return [];
  const findings: Finding[] = [];
  if (mission.status === "blocked") findings.push({ code: "blocked", message: "Mission is blocked" });
  if (mission.dueSol < board.snapshotSol) {
    const overdue = board.snapshotSol - mission.dueSol;
    findings.push({ code: "overdue", message: `${overdue} ${overdue === 1 ? "sol" : "sols"} overdue` });
  }
  if (!mission.owner) findings.push({ code: "unowned", message: "Needs a flight lead" });
  if (board.snapshotSol - mission.updatedSol > 7) {
    findings.push({ code: "stale", message: `No update for ${board.snapshotSol - mission.updatedSol} sols` });
  }
  const outstanding = mission.dependencies.filter(
    (id) => board.missions.find((candidate) => candidate.id === id)?.status !== "landed",
  );
  if (outstanding.length > 0) {
    findings.push({ code: "dependency", message: `Waiting on ${outstanding.join(", ")}` });
  }
  return findings;
}

export function selectMissions(board: MissionBoard, query: string, attentionOnly: boolean): Mission[] {
  const normalized = query.trim().toLocaleLowerCase();
  return board.missions.filter((mission) => {
    const text = [mission.id, mission.title, mission.summary, mission.owner ?? "unassigned",
      mission.destination, ...mission.tags].join(" ").toLocaleLowerCase();
    return text.includes(normalized) && (!attentionOnly || findingsFor(mission, board).length > 0);
  });
}

export function summarize(board: MissionBoard) {
  return {
    total: board.missions.length,
    active: board.missions.filter((mission) => mission.status !== "landed").length,
    landed: board.missions.filter((mission) => mission.status === "landed").length,
    needsAttention: board.missions.filter((mission) => findingsFor(mission, board).length > 0).length,
  };
}
