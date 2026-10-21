import fixture from "../data/missions.json";
import { findingsFor, parseBoard, selectMissions, statuses, summarize } from "./missions.ts";
import type { Mission, Status } from "./missions.ts";
import "./style.css";

const board = parseBoard(fixture);
const summary = summarize(board);
const labels: Record<Status, string> = {
  ready: "Ready for launch", "in-flight": "In flight", blocked: "Needs a hand", landed: "Landed",
};
const symbols: Record<Status, string> = { ready: "◎", "in-flight": "↗", blocked: "⊘", landed: "✓" };
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Mission control could not find its app root.");

app.innerHTML = `
  <a class="skip-link" href="#mission-board">Skip to missions</a>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Octo Orbit home"><img src="/orbit.svg" alt="" width="36" height="36" /> <strong>Octo Orbit</strong><span class="public-badge">Public demo</span></a>
    <a class="source-link" href="https://github.com/my-monalisa-org/octo-orbit">View repository <span aria-hidden="true">↗</span></a>
  </header>
  <main>
    <div class="repo-line"><span aria-hidden="true">◈</span> my-monalisa-org <span>/</span> <strong>octo-orbit</strong><span class="language"><i></i> TypeScript</span></div>
    <section class="hero" aria-labelledby="page-title">
      <div><div class="eyebrow"><span class="signal"></span> MISSION CONTROL / SOL ${board.snapshotSol}</div>
        <h1 id="page-title">Small crew.<br />Cosmic possibilities.</h1>
        <p>A little mission board for the wildly curious.<br />Ship good things. Help your crew. Take the scenic orbit.</p>
        <a class="primary-link" href="#mission-board">Explore the missions <span aria-hidden="true">↓</span></a>
      </div>
      <div class="orbital-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="star star-one">+</span><span class="star star-two">+</span><span class="little-planet"></span><img src="/orbit.svg" alt="" /><div class="orbit-caption">CURRENT EXPEDITION<span></span></div></div>
    </section>
    <section class="stats" aria-label="Mission statistics">
      <div><span class="stat-icon lavender" aria-hidden="true">◈</span><div><strong>${summary.total.toString().padStart(2, "0")}</strong><span>Total missions</span></div></div>
      <div><span class="stat-icon blue" aria-hidden="true">↗</span><div><strong>${summary.active.toString().padStart(2, "0")}</strong><span>Active adventures</span></div></div>
      <div><span class="stat-icon amber" aria-hidden="true">⊘</span><div><strong>${summary.needsAttention.toString().padStart(2, "0")}</strong><span>Need attention</span></div></div>
      <div><span class="stat-icon green" aria-hidden="true">✓</span><div><strong>${summary.landed.toString().padStart(2, "0")}</strong><span>Happy landings</span></div></div>
    </section>
    <section id="mission-board" class="board-section" aria-labelledby="board-title" tabindex="-1">
      <div class="section-heading"><div><h2 id="board-title">The mission board <span class="count">${summary.total}</span></h2><p id="season"></p></div><span class="snapshot-badge">Synthetic snapshot · Sol ${board.snapshotSol}</span></div>
      <div class="toolbar"><label class="search"><span aria-hidden="true">⌕</span><span class="sr-only">Search missions, crew, or tags</span><input id="search" type="search" placeholder="Search missions, crew, or tags…" autocomplete="off" /></label>
        <label class="attention-filter"><input id="attention" type="checkbox" /> Needs attention only</label>
        <p id="result-count" role="status" aria-live="polite"></p>
      </div>
      <div id="lanes" class="lanes"></div>
      <div id="empty" class="empty" hidden><span aria-hidden="true">✧</span><h3>No missions in this orbit</h3><p>Try a different search or clear your filters.</p><button id="reset" type="button">Clear filters</button></div>
    </section>
    <aside class="flight-note"><span class="note-icon" aria-hidden="true">✦</span><div><h2>Your future flight director</h2><p>A repo-local agentic workflow can turn mission risks into one focused flight brief. Scheduled weekly after merge, with manual dispatch available. No AI runs are simulated here.</p><a href="https://github.com/my-monalisa-org/octo-orbit/blob/main/.github/workflows/mission-health.md">Read the workflow <span aria-hidden="true">↗</span></a></div><span class="workflow-badge">GitHub Agentic Workflows</span></aside>
  </main>
  <footer><span>Made for curious octonauts. Built in the open.</span><span>Fictional crew. Real code. <span class="footer-star" aria-hidden="true">✧</span></span></footer>
`;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function card(mission: Mission) {
  const article = element("article", `mission-card ${mission.status}`);
  const header = element("div", "card-header");
  header.append(element("span", "mission-id", mission.id), element("span", `priority ${mission.priority}`, mission.priority));
  const title = element("h4", "mission-title", mission.title);
  article.append(header, title, element("p", "mission-summary", mission.summary));
  const tags = element("div", "tags");
  for (const tag of mission.tags) tags.append(element("span", "tag", tag));
  article.append(tags);
  const findings = findingsFor(mission, board);
  if (findings.length > 0) {
    const riskList = element("ul", "risks");
    for (const finding of findings) riskList.append(element("li", "", finding.message));
    article.append(riskList);
  }
  const progress = element("progress", "");
  progress.max = 100;
  progress.value = mission.progress;
  progress.setAttribute("aria-label", `${mission.id} completion`);
  article.append(element("div", "progress-label", `${mission.progress}% complete`), progress);
  const metadata = element("div", "card-meta");
  const owner = element("span", mission.owner ? "owner" : "owner unassigned");
  owner.append(element("span", "avatar", mission.owner?.slice(0, 1) ?? "?"), document.createTextNode(mission.owner ?? "Unassigned"));
  metadata.append(owner, element("span", "due", `Due sol ${mission.dueSol}`));
  const details = element("details", "mission-details");
  details.append(element("summary", "", "Flight notes"), element("p", "", mission.nextStep), element("p", "destination", `Destination: ${mission.destination} · Updated sol ${mission.updatedSol}`));
  article.append(metadata, details);
  return article;
}

const search = document.querySelector<HTMLInputElement>("#search")!;
const attention = document.querySelector<HTMLInputElement>("#attention")!;
const lanes = document.querySelector<HTMLDivElement>("#lanes")!;
document.querySelector("#season")!.textContent = `${board.season} / A shared backlog, a bigger universe.`;
document.querySelector(".orbit-caption span")!.textContent = board.season;

function render() {
  const selected = selectMissions(board, search.value, attention.checked);
  lanes.replaceChildren();
  for (const status of statuses) {
    const missions = selected.filter((mission) => mission.status === status);
    const lane = element("section", "lane");
    lane.setAttribute("aria-labelledby", `lane-${status}`);
    const heading = element("h3", `lane-heading ${status}`);
    heading.id = `lane-${status}`;
    heading.append(element("span", "lane-symbol", symbols[status]), document.createTextNode(labels[status]), element("span", "count", String(missions.length)));
    lane.append(heading);
    for (const mission of missions) lane.append(card(mission));
    if (missions.length === 0) lane.append(element("p", "lane-empty", "Clear skies here."));
    lanes.append(lane);
  }
  document.querySelector("#result-count")!.textContent = `${selected.length} of ${board.missions.length} missions`;
  document.querySelector<HTMLDivElement>("#empty")!.hidden = selected.length > 0;
  lanes.hidden = selected.length === 0;
}
search.addEventListener("input", render);
attention.addEventListener("change", render);
document.querySelector("#reset")!.addEventListener("click", () => {
  search.value = "";
  attention.checked = false;
  render();
  search.focus();
});
render();
