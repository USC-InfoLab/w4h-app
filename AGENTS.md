# AGENTS.md — W4H App

Agent instructions for the Wearables for Health (W4H) multi-repo workspace.

These instructions apply to the entire `w4h-app/` repository unless overridden by a more specific nested `AGENTS.md`.

The shared W4H architecture overview (all repos, concepts, flows) is at the end of this file.

## Where this repo fits in W4H

- **The only human-facing client.** The SPA talks to `w4h-api` only (`VITE_API_URL`, wrapper in `src/utils/api.js`); it never touches Postgres or contribution repos. Business rules, ACL and expensive computation live in the API.
- **Two shells:** Super admin lands in the **Platform Admin** shell (`/admin/home`, settings, accounts, teams, usage, audit, `/admin/contributions` catalog curation). Admins and Users land in the **app shell** (`/home`, `/projects`, `/projects/:id`, `/contributions`, `/docs`). Team-admin pages (`/admin/projects`, `/admin/datasets`, `/admin/datasets/shares`, `/admin/users`) live under `/admin/*` but in the app shell. Route guards and `meta` flags are in `src/router/index.js`.
- **Where the platform flows surface:**
  - `ProjectWorkspaceView.vue` (`/projects/:id`) is the main workspace: linked datasets, the Dataset overview pane with **Run import...** (ADR-022), and Analytics with **Run analysis...** (ADR-023). Both call `POST /contributions/:slug/run` and poll `GET /contributions/runs/:id`. `src/utils/importerSlugForDataset.js` infers which importer loaded a dataset on re-runs.
  - `/contributions` and `/contributions/:slug` browse the catalog (`w4h.contributions`); `src/utils/contributionKinds.js` labels kinds.
  - `/docs/*` renders Help imported from `w4h-docs`.
  - Profile → API keys issues the `w4h_sk_` keys that notebooks, CLIs and `run.sh` use.
- **Known UI gaps:** `src/components/project/ProjectUserPanel.vue` (personal API credential Generate/Rotate/Reveal, calling `users/me/api-key*`) is not rendered by any view, so users only see their key on the one-time screens in `LoginView.vue` (initial admin) and `AcceptInviteView.vue`. Help text still says "Profile → API keys". There is also no upload UI yet for the API's staged-upload path (`POST /contributions/:slug/uploads`, used by `w4h-fitbit-csv-file-importer`).
- **Packaging:** `w4h-docker` builds this app with `VITE_API_URL=/api/` behind nginx on `127.0.0.1:5180`, plus an optional `VITE_JUPYTER_URL` link to the convenience Jupyter.

When app behavior depends on another repository, inspect the relevant sibling repo rather than guessing its behavior or contract.

## Source of truth

- Requirements: sibling `w4h-docs/dev/mvp.md`
- Roles / ACL: `w4h-docs/dev/ADR-004-acl-roles.md`
- Architecture: `w4h-docs/dev/architecture.md`

When implementation and documentation appear inconsistent, identify the discrepancy rather than silently choosing or inventing product behavior.

## Product model (locked)

- **Team** = tenancy. **Project** = primary access / work unit.
- UI labels: **Super admin** · **Admin** · **User** (`src/utils/roles.js`). No “Project admin”.
- Team admin is **per team** (`team_members.role`), not a platform role. Gate Admin UI on the server's `user.caps` (`canManageTeam`, `isScopedTeamAdmin` in `roles.js`), never on `user.role === 'team_admin'`. `caps.can_create_teams` marks an approved Admin with no team yet: the router sends them to `/team/new` first.
- Super admin → Platform Admin shell only. Admins/Users → app shell. The Super admin **approves access requests** (`/admin/access-requests`) and does **not** create or approve teams; Admins create their own (`/team/new`, account menu → *New team*).
- A project may have **collaborating teams** (ADR-027); members show their home team. A team member who is not on a project sees only its Datasets and People tabs (`capabilities.is_participant`).
- W4H does not register project-owned notebooks. Browse **Contributions** (`/contributions`).
- **Charts** (ADR-029): `src/components/viz/` is the only chart layer — Apache ECharts, tree-shaken in `echarts.js`, options built by pure functions in `vizOptions.js`, framed by `ChartCard.vue`. Do not add per-vendor chart code or another chart library. Charts take data from `POST /datasets/:id/analytics/series`; they never fetch raw rows. Keep it lazy-loaded (`defineAsyncComponent`) so ECharts stays out of the main bundle. Times are wall-clock values sent as UTC-labelled text: keep `useUTC: true` and never `toLocaleString()` them.
- **Published reports** render only inside `<iframe sandbox="allow-scripts" :srcdoc>` (`ProjectReportsPanel.vue`). Never add `allow-same-origin`, `allow-top-navigation`, `allow-popups` or `allow-forms`.
- Dataset stats/overview always appear in the context of a **selected dataset**.
- Project docs are project-private and are not platform Help.
- API credential UI is masked by default.
- Showing or rotating API credentials requires password re-entry.
- Revealed API credentials auto-hide.

Do not change these product rules without an explicit product-level request.

## This repository

- Stack: Vue 3, Vite, Pinia, Vue Router, Bootstrap 5 + bootstrap-icons.
- App code lives under `src/` (`views`, `components`, `utils`, etc.).
- Preserve existing design-system and nearby component patterns.
- Environment: copy `.env.example` → `.env`. `VITE_*` only. Screenshot / Playwright accounts are seeded in **w4h-api** and configured in **w4h-docs** (`dev/docs-fixtures.md`), not in this file.
- Local development requires a running **w4h-api**.

Common scripts:

```bash
npm run dev
npm run build
npm run lint
npm run test:e2e
npm run index:ui   # regenerate UI_INDEX.md (routes / views / components)
```

Dependencies are added deliberately (the lock-file change is part of the task): ECharts + `vue-echarts` are the approved chart stack (ADR-029).

Structural UI map: [`UI_INDEX.md`](./UI_INDEX.md) (generated; not feature docs). Re-run `npm run index:ui` when routes or the `src/views` / `src/components` tree change. Do not regenerate on every build.

## Frontend / API boundary

- Do not invent API fields or assume undocumented response shapes.
- Do not change or assume API contracts solely in `w4h-app`.
- API field, response-shape, database-schema, or ACL changes belong in **w4h-api** first.
- After an API contract change, update `w4h-app` and relevant `w4h-docs` documentation as needed.
- When behavior depends on an API contract, inspect **w4h-api** rather than guessing.
- Do not compute expensive dataset-wide statistics in the browser when they belong in the API or cached metadata layer.
- Dataset summaries should use the project's established metadata/summary mechanisms rather than introducing live full-table counting from the UI.

## Change discipline

- Keep changes tightly scoped to the requested behavior.
- Avoid drive-by refactors, formatting changes, dependency upgrades, or unrelated cleanup.
- Prefer modifying the smallest appropriate component or utility.
- Reuse existing components, utilities, Bootstrap conventions, bootstrap-icons, and CSS variables before introducing new patterns.
- Match the style and structure of nearby code.
- Preserve existing behavior outside the requested change unless the task explicitly requires otherwise.
- Do not introduce new dependencies when the existing stack can reasonably solve the problem.

## UI and accessibility

For user-facing changes:

- Preserve responsive behavior across the existing Bootstrap breakpoints.
- Use semantic HTML and appropriate native controls where possible.
- Preserve keyboard accessibility for interactive elements.
- Use labels and ARIA attributes where they add necessary accessibility context.
- Avoid hard-coded styling when an existing Bootstrap utility, component convention, or CSS variable is appropriate.
- Check both the presence and absence of optional data when changing conditional UI.
- Account for long names/text and empty states when they are relevant to the affected component.

### Modals — always use Bootstrap's `Modal` JS class

New dialogs must be wired with `import { Modal } from 'bootstrap'` (`new Modal(el)`, `.show()`/`.hide()`, listening to `show.bs.modal`/`hidden.bs.modal`), the same way `ProjectDatasetMasterDetail.vue`'s "Dataset details" dialog (`detailsModal`) is built. Do **not** hand-roll a modal with `v-if`/a boolean ref toggling `class="modal fade show" style="display: block;"` plus a manually rendered `.modal-backdrop` div. The hand-rolled pattern renders the markup but never calls Bootstrap's show/hide machinery, so the dialog never receives or traps keyboard focus and doesn't restore focus to the trigger element on close — this exact regression (a popup opening but not receiving focus) has recurred more than once and was fixed each time by switching to the real `Modal` class. Several older components (`ReportIssueModal.vue`, `WhatsNewModal.vue`, `DocsRefreshModal.vue`, `AboutModal.vue`, `DocsDeleteDocModal.vue`) still use the hand-rolled pattern — treat them as known debt, not as a precedent to copy for new dialogs.

## Validation

The project is currently evolving rapidly, and changes are primarily validated manually by the developer.

Keep automated validation proportional to the task.

- **Do not run Playwright/E2E tests unless explicitly requested.**
- **Do not take screenshots or perform visual browser validation unless explicitly requested.**
- **Do not run the full test suite unless explicitly requested.**
- Do not add or update tests unless explicitly requested or the task itself concerns testing.
- Run `npm run build` after substantive frontend changes when practical.
- For small/localized changes, prefer targeted static checks over broad validation.
- Run lint or other targeted checks when they are directly relevant to the files or behavior changed.
- Do not spend time fixing unrelated pre-existing test, lint, or build failures.
- If a validation command fails for reasons unrelated to the change, report that clearly rather than expanding the scope of the task.

When finishing a change, briefly state:

1. What changed.
2. Which automated validation, if any, was run.
3. What the developer should manually verify.

For a small visual change, for example, prefer guidance such as:

> Changed the dataset row alignment so the database icon is vertically centered with the dataset text. No Playwright tests were run. Manually verify the dataset selector with and without metadata text and at the relevant responsive widths.

## Cross-repo changes

Use `w4h-repos.code-workspace` when a task spans repositories.

For cross-cutting behavior:

1. Identify which repository owns the behavior or contract.
2. Make API/schema/ACL contract changes in **w4h-api** first.
3. Update **w4h-app** to consume the resulting contract.
4. Update ADR/MVP/architecture documentation in **w4h-docs** when product behavior or architecture changes.
5. Avoid duplicating business

<!-- BEGIN w4h-system-overview: identical in every W4H repo's AGENTS.md. Edit all copies together. -->

## W4H system overview (shared across all repos)

**W4H (Wearables for Health) Toolkit** loads wearable-device data into PostgreSQL, organizes it by team, project and dataset, controls access, and runs curated analyses on it. Each signal is a **GeoMTS** (Geospatial Multivariate Time Series) table whose roles (`subject`, `time`, optional `geo`, `values[]`) are stored in `w4h.tables.mapping_json`, not in fixed column names. Three repos form the platform, one packages it, and the rest are **contributions** listed in the in-app catalog (`w4h.contributions`).

| Repo | Role |
|---|---|
| `w4h-api` | Express API and Postgres DDL (`w4h` schema): auth, ACL, ingest, catalog, contribution runner, SQL engine. Port 2026 |
| `w4h-app` | Vue 3 + Vite SPA; talks only to `w4h-api`. Port 5173 |
| `w4h-docs` | Product rules, MVP, ADRs and guides; imported by the API as in-app Help. Owns product decisions |
| `w4h-docker` | Compose stack (`api`, `app`, `notebooks`) built from sibling repos; Postgres is external |
| `w4h-sample-fitbit-csv`, `w4h-sample-icde-demo-csv` | Synthetic sample CSVs plus `manifest.yaml` (ICDE includes a `gps_track` geo signal) |
| `w4h-sample-fitbit-csv-importer`, `w4h-sample-icde-demo-csv-importer` | Runnable importers (notebook, CLI, `run.sh`) for those samples |
| `w4h-fitbit-csv-file-importer` | Runnable importer for user-supplied Fitbit CSVs: profile headers, review a drafted mapping, ingest |
| `w4h-sql-compute-mets` | SQL contribution (YAML + SQL template) that `w4h-api` executes in-process |
| `fft_approximate` | Postgres C extension, catalog slug `fft-approximate`; no API involvement |
| `w4h-demo-approximate-queries` | Notebook comparing `fft_approximate` with exact averages over direct Postgres |

**Main flows:**

1. **Ingest:** importers post 500-row chunks to `POST /datasets/:id/import/csv-batch`. `lib/ingest-csv.js` creates `ds_<dataset_id>.<table_prefix>_<signal>` and upserts its `w4h.tables` mapping.
2. **In-app Run (ADR-022):** `POST /contributions/:slug/run` makes `lib/contribution-runner.js` spawn `../<slug>/run.sh` with the user's `W4H_API_KEY`, `W4H_API_BASE` and `W4H_DATASET_ID`. Stdout lines `@@PROGRESS@@ {json}` drive the progress bar.
3. **SQL analytics (ADR-023):** `lib/sql-contribution-engine.js` reads `../<slug>/manifest.yaml` and `sql/`, binds identifiers from `w4h.tables`, and runs in-process. There is no free-SQL endpoint.
4. **Extensions:** the operator installs `fft_approximate` on their Postgres; notebooks call it directly.

**Layout:** clone every repo as a sibling in one folder. The API finds contributions at `../<slug>` (override `CONTRIBUTION_RUNNER_REPO_ROOT`) and docs at `DOCS_REPO_PATH=../w4h-docs`.

**Cross-repo changes:** `w4h-api` first (regenerate `API_INDEX.md`), then `w4h-app`, then `w4h-docs`. Catalog rows are seeded in `w4h-api/data/schema.sql`. Start at `w4h-docs/dev/mvp.md` and `w4h-docs/dev/ADR-README.md` for decisions, and `w4h-docs/dev/developer-setup.md` for local setup, getting an API key, test personas, troubleshooting, per-repo test commands, default branches and a glossary. Do not commit or push unless asked; never commit `.env` files, API keys or participant data.

<!-- END w4h-system-overview -->
