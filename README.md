# W4H Web App

Vue 3 + Vite front end for the [Wearables for Health (W4H) Toolkit](https://infolab.usc.edu/projects/W4H/). This SPA is the day-to-day shell for **Admins** and **Users** (projects, datasets, docs browser, project workspace). **Super admins** use the separate **Platform Admin** shell after login.

Product requirements and roles live in sibling repo **`w4h-docs`** (`dev/mvp.md`, `dev/ADR-004-acl-roles.md`). The app does not run standalone — it needs a running **`w4h-api`** instance.

## Stack

- Vue 3, Vite, Pinia, Vue Router
- Bootstrap 5 + bootstrap-icons
- Axios → `VITE_API_URL`

Structural map (generated): [`UI_INDEX.md`](./UI_INDEX.md) — run `npm run index:ui` when routes or components change.

## Prerequisites

- Node.js 20+ (22 recommended, matches Docker images)
- PostgreSQL reachable via **`w4h-api`** (the UI never connects to Postgres directly)
- Sibling repos for full local work:
  - [`w4h-api`](https://github.com/USC-InfoLab/w4h-api) — required
  - [`w4h-docs`](https://github.com/USC-InfoLab/w4h-docs) — platform Help content (served/imported by the API)
  - [`w4h-datasets`](https://github.com/USC-InfoLab/w4h-datasets), [`w4h-notebooks`](https://github.com/USC-InfoLab/w4h-notebooks) — optional for sample data and analysis workflows

Open the multi-repo workspace via `w4h-repos.code-workspace` in `w4h-docs` when changing cross-cutting behavior.

## Local development

```bash
npm install
cp .env.example .env
```

Set `VITE_API_URL` to your API origin (default `http://localhost:2026/`).

Start the API first (`npm start` in `w4h-api`), then:

```bash
npm run dev
```

Default dev URL: `http://localhost:5173`. Bind a specific host if another service already uses port 5173 on `localhost` vs `127.0.0.1`:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

### First-time platform setup

On a fresh install, the login page walks you through **PostgreSQL connection** then **Super admin** creation. Docker deployments use the same wizard after `docker compose up` — configure external Postgres in the browser, not in compose env.

See [Quick Start](https://github.com/USC-InfoLab/w4h-docs/blob/main/quick-start.md) in `w4h-docs`.

Seed and run the fixture database with:

```bash
cd ../w4h-api
node bin/w4h seed-docs
npm run start:sample
```

Canonical fixture details stay in **`w4h-docs`** at `dev/docs-fixtures.md`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production bundle to `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (run only when needed) |
| `npm run index:ui` | Regenerate `UI_INDEX.md` |

### Local debug logins

DEV test accounts live in the seeded `w4h-sample` fixture. If you want a local copy/paste note for manual login, keep it in an untracked `w4h-app/.env.development.local`, not in tracked files.

Warning: these are disposable local demo credentials for `node bin/w4h seed-docs` plus `npm run start:sample` only. Do not copy them into production, shared deployments, or real accounts.

Example local-only note file:

```dotenv
# Untracked local dev notes only. Do not use for production or shared deployments.
DEV_LOGIN_SUPERADMIN_EMAIL=superadmin@example.com
DEV_LOGIN_ADMIN_EMAIL=admin@example.com
DEV_LOGIN_USER_EMAIL=user@example.com
DEV_LOGIN_PASSWORD=DocsOnly!2026
```

## Production / Docker

Use sibling repo **`w4h-docker`**:

```bash
cd w4h-docker
docker compose build
docker compose up -d
```

Open the app URL (default **`http://127.0.0.1:5180`**) and **connect external PostgreSQL in the setup wizard** — not `localhost:5173` (another app may own that port on macOS).

If Postgres runs on your machine, use **`host.docker.internal`** as the database host in the wizard (not `localhost`).

The production app image builds with `VITE_API_URL=/api/`; nginx proxies API and docs media to the `api` service.

## API boundary

- All data and auth go through **`w4h-api`** — do not assume undocumented response shapes.
- Session auth: JWT in `localStorage` (`w4h.user.token`), sent as `Authorization` on API calls.
- Programmatic access from notebooks/scripts uses personal API keys (`X-W4H-API-Key`) — see ADR-007 in `w4h-docs`.

## Roles (UI labels)

| Role | Shell after login |
| --- | --- |
| Super admin | Platform Admin only (`/admin/*`) |
| Admin (team admin) | App shell — teams, datasets, projects |
| User | App shell — assigned projects |

There is no “toggle into Platform Admin” for Super admins.

## Resources

- [W4H project page](https://infolab.usc.edu/projects/W4H/)
- [Vue 3](https://vuejs.org/) · [Vite](https://vite.dev/)
- Agent / contributor notes: [`AGENTS.md`](./AGENTS.md)
