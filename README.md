# Octo Orbit

**Small crew. Cosmic possibilities.** A tiny TypeScript mission board for
octonauts: dark mission-control styling, a shared backlog, and an agentic flight
director that knows when to stay quiet.

Vanilla TypeScript + Vite. No backend, database, external fonts, or API keys
needed to run the app.

## Lift off

Use **Node.js 24+** and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Search by mission, crew, destination, or tag;
toggle **Needs attention only**; expand **Flight notes** for a mission's next
step. Filters are local and do not change the source fixtures.

```sh
npm run check       # Node tests, strict TypeScript checks, production build
npm run health      # Deterministic JSON health snapshot; no AI/network calls
npm run preview     # Serve the production build after npm run build
```

## Fictional crew, useful data

[`data/missions.json`](data/missions.json) is explicitly synthetic. Its fixed
snapshot is **sol 42** (a fictional mission day), not a real activity timestamp.
Eight missions include healthy work, two happy landings, an unowned mapping
mission, stale biscuit inventory, and an overdue receiver patch that unblocks
the lunar lighthouse. The baseline is **8 total, 6 active, 2 landed, 4 needing
attention**.

The board and CLI share [`src/missions.ts`](src/missions.ts). Active missions
need attention if blocked, overdue (`dueSol < snapshotSol`), unowned, stale
(`snapshotSol - updatedSol > 7`), or waiting on a non-landed dependency.
Landed missions are excluded from alerts. Due today and seven sols since an
update are healthy boundaries, covered by tests.

Edit the JSON to explore scenarios. Keep unique IDs, valid dependency references,
progress from 0–100, and `updatedSol <= snapshotSol`; landed missions must be
100% complete. Invalid fixtures fail explicitly. An empty board or all-healthy
snapshot is valid. Change `snapshotSol` deliberately rather than silently
aging fixtures against the real clock.

## What runs when

| Workflow | Trigger | Result |
| --- | --- | --- |
| [Mission control CI](.github/workflows/ci.yml) | Pull requests, pushes to `main`, manual dispatch | Install locked dependencies, test, type-check, build, validate health JSON, recompile gh-aw and check lock freshness. No AI calls. |
| [Mission health flight check](.github/workflows/mission-health.md) | Weekly on **Monday** at a compiler-scattered UTC time, plus manual dispatch | Copilot reads a prepared snapshot and up to 20 existing open flight briefs; prioritizes up to three interventions in one issue, or explicitly no-ops. |

The agentic workflow is real **GitHub Agentic Workflows (gh-aw)** Markdown plus
its generated `.lock.yml`, not an ordinary Actions script pretending to be AI.
It does not run on pull requests or pushes. Its schedule becomes eligible only
after a reviewed merge to the default branch, subject to GitHub scheduling
delays. Bootstrap CI never dispatches AI workflows; a manual AI run requires
explicit maintainer approval for billable inference.

The fuzzy schedule `weekly on monday` preserves the weekday and weekly cadence.
gh-aw deterministically scatters the clock time; the generated `.lock.yml`
records the resolved UTC cron rather than choosing a new random time each run.

The 16-character fingerprint covers the synthetic snapshot and computed findings.
An existing open brief for that fingerprint yields a no-op; safe-output title
deduplication also guards repeated creation. Changed evidence produces one new
brief and closes older briefs **from this workflow only**. Closing the current
brief deliberately allows a later run to revisit the same snapshot.

### Authentication, permissions, and billing

- Compiled with **gh-aw v0.92.6**; use that version to reproduce the lock.
  It supports `features.copilot-requests: true` with
  `permissions.copilot-requests: write`, so inference authenticates using the
  repository's ephemeral **GitHub Actions workflow token**. No
  `COPILOT_GITHUB_TOKEN` or personal credential is configured.
- Before running, a repository/organization administrator must allow GitHub
  Actions, the pinned gh-aw/actions and containers, workflow-token Copilot
  requests, and the selected **`gpt-5.3-codex`** model. An organization Copilot
  subscription with centralized billing is required for this authentication path.
  Copilot access, applicable
  organization/enterprise policy, model availability, and funded billing/quota
  must permit inference. Public repositories do **not** imply free AI inference.
  If that authentication feature is unavailable for this organization, stop and
  resolve the prerequisite rather than inserting a token or changing models
  silently.
- Agent repository permissions are `contents: read` and `issues: read`; the
  only non-read permission on its job is `copilot-requests: write` for inference.
  Generated safe-output jobs have scoped issue-write permission to publish and
  supersede reports. The agent cannot write code or push changes. Agent network
  access is denied (`allowed: []`); trusted preparation steps read GitHub issues
  before inference, and the agent's GitHub MCP server is disabled. Mission and
  issue text are treated as untrusted data.
- Limits: **8 turns, 10 minutes, 20 AI Credits per run, 40 AI Credits per
  triggering user over 24 hours**, at most one report with three interventions.
  These are gh-aw/AWF guardrails, not a promise of a hard billing ceiling;
  organization billing controls still apply. Actions execution and any auxiliary
  framework inference may also have costs. Daily guardrails are per user, not an
  organization-wide spending cap.

To compile and validate locally with the already installed CLI:

```sh
gh aw version
gh aw compile mission-health --strict
gh aw validate mission-health --strict
gh aw list
```

Review and commit both the Markdown source and generated lock after edits.
Compilation/validation do not authorize dispatch. Missing optional scanners or
authentication prerequisites must be resolved explicitly; do not bypass them or
upgrade a shared CLI behind other sessions.

## An honest demo

There is **no CAO installation, Repo Assist, seeded telemetry, synthetic run
history, or fabricated cost** here. Those integrations belong to the later
quickstart. To populate a monitoring dashboard, an authorized maintainer must
first approve publication/merge and actual billable workflow execution.
Only genuine GitHub run logs and gh-aw artifacts should be used as execution
evidence. Mission fixtures are demo domain data, never evidence that AI ran.

Source layout: `src/main.ts` renders the accessible, responsive board;
`src/missions.ts` owns validation/filtering/health rules;
`scripts/mission-health.ts` emits JSON with a stable fingerprint; Node's built-in
test runner covers fixture validation and health/search boundaries.

MIT licensed. The little orbital cat illustration is original demo artwork,
not an official GitHub logo or product.
