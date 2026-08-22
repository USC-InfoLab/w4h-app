# AGENTS.md — W4H App

Agent instructions for the Wearables for Health (W4H) multi-repo workspace.

These instructions apply to the entire `w4h-app/` repository unless overridden by a more specific nested `AGENTS.md`.

## Workspace map

| Repo | Role |
|------|------|
| **w4h-docs** | Product docs, ADRs, MVP, architecture, guides |
| **w4h-app** (this repo) | Vue 3 + Vite web UI |
| **w4h-api** | Express API + PostgreSQL schema / ACL |
| **w4h-utils** | Scripts, CLI helpers, utility notebooks |
| **w4h-datasets** | Sample / synthetic CSV and JSON |
| **w4h-notebooks** | Index of legacy notebooks; new tools are one repo per contribution |
| **w4h-docker** | Docker Compose packaging; bakes `VITE_API_URL=/api/` and optional `VITE_JUPYTER_URL` |

Open these together via `w4h-repos.code-workspace` when changing cross-cutting behavior.

When app behavior depends on another repository, inspect the relevant sibling repo rather than guessing its behavior or contract.

## Source of truth

- Requirements: sibling `w4h-docs/dev/mvp.md`
- Roles / ACL: `w4h-docs/dev/ADR-004-acl-roles.md`
- Architecture: `w4h-docs/dev/architecture.md`

When implementation and documentation appear inconsistent, identify the discrepancy rather than silently choosing or inventing product behavior.

## Product model (locked)

- **Team** = tenancy. **Project** = primary access / work unit.
- UI labels: **Super admin** · **Admin** · **User** (`src/utils/roles.js`). No “Project admin”.
- Super admin → Platform Admin shell only. Admins/Users → app shell.
- W4H does not register project-owned notebooks. Browse **Contributions** (`/contributions`).
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