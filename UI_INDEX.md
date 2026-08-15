# UI Index

Structural map of `w4h-app` for agents and humans. **Index only** — not feature docs.

- Regenerate: `npm run index:ui`
- Generated: 2026-08-14
- Do not hand-edit the lists below; change code, then re-run the script.

## Orientation

| Area | Path |
|------|------|
| Router | `src/router/index.js` |
| Views | `src/views/` |
| Components | `src/components/` |
| Stores | `src/stores/` |
| Utils | `src/utils/` |
| Composables | `src/composables/` |
| Roles | `src/utils/roles.js` |

Shells: app (`NavBar`) vs Platform Admin (`AdminNavBar`). Project workspace: `ProjectWorkspaceView` → `ProjectAdminPanel` / `ProjectUserPanel`.

## Routes

| Path | Name | View | Meta |
|------|------|------|------|
| `/login` | login | `views/LoginView.vue` | guest |
| `/loginCode` | loginCode | `views/LoginWithCode.vue` | guest |
| `/invite/:token` | acceptInvite | `views/AcceptInviteView.vue` | guest |
| `/logout` | — | `→ /login` | — |
| `/` | default | `views/LoginView.vue` | guest |
| `/home` | home | `views/HomeView.vue` | auth |
| `/projects` | projects | `views/ProjectsView.vue` | auth |
| `/projects/:id` | projectWorkspace | `views/ProjectWorkspaceView.vue` | auth |
| `/userProfileEdit` | userProfileEdit | `views/UserProfileEdit.vue` | auth |
| `/docs/new` | docNew | `views/docs/DocsView.vue` | auth |
| `/docs` | — | `→ /docs/home` | — |
| `/docs/:slug` | docs | `views/docs/DocsView.vue` | auth |
| `/admin/home` | adminHome | `views/admin/HomeView.vue` | auth, adminPage |
| `/admin/settings` | adminSettings | `views/admin/SettingsView.vue` | auth, adminPage, superAdmin |
| `/admin/audit-log` | adminAuditLog | `views/admin/AuditLogView.vue` | auth |
| `/admin/usage` | adminUsage | `views/admin/UsageView.vue` | auth, adminPage, superAdmin |
| `/admin/api-usage` | — | `→ /admin/usage` | — |
| `/admin/style-guide` | adminStyleGuide | `views/admin/StyleGuideView.vue` | auth, adminPage, superAdmin |
| `/admin/database` | adminDatabase | `→ /admin/settings` | — |
| `/admin/teams/add` | adminTeamsAdd | `views/admin/TeamsAdd.vue` | auth, adminPage, superAdmin |
| `/admin/accounts` | accounts | `views/admin/AccountsView.vue` | auth, adminPage, superAdmin |
| `/admin/accounts/:id/edit` | accountsEdit | `views/admin/AccountsEdit.vue` | auth, adminPage, superAdmin |
| `/admin/accounts/add` | accountsAdd | `views/admin/AccountsAdd.vue` | auth, adminPage, superAdmin |
| `/admin/teams` | adminTeams | `views/admin/TeamsView.vue` | auth, adminPage, superAdmin |
| `/admin/teams/:id/edit` | adminTeamsEdit | `views/admin/TeamsEdit.vue` | auth |
| `/admin/projects` | adminProjects | `views/admin/ProjectsView.vue` | auth |
| `/admin/projects/add` | adminProjectsAdd | `views/admin/ProjectsAdd.vue` | auth, teamAdmin |
| `/admin/projects/:id/edit` | adminProjectsEdit | `views/admin/ProjectsEdit.vue` | auth |
| `/admin/datasets` | adminDatasets | `views/admin/DatasetsView.vue` | auth |
| `/admin/datasets/add` | adminDatasetsAdd | `views/admin/DatasetsAdd.vue` | auth, teamAdmin |
| `/admin/datasets/shares` | adminDatasetsShares | `views/admin/DatasetsSharesView.vue` | auth, teamAdmin |
| `/admin/datasets/:id/edit` | adminDatasetsEdit | `views/admin/DatasetsEdit.vue` | auth, teamAdmin |
| `/admin/users` | users | `views/admin/UsersView.vue` | auth, adminPage |
| `/admin/users/add` | usersAdd | `views/admin/UsersAdd.vue` | auth, teamAdmin |
| `/admin/usersAdd` | — | `→ /admin/users/add` | — |
| `/admin/usersEdit/:email` | usersEdit | `views/admin/UsersEdit.vue` | auth, teamAdmin |
| `/:pathMatch(.*)*` | not-found | `views/LoginView.vue` | guest |

## Views (29)

### `src/views/`
- AcceptInviteView.vue
- HomeView.vue
- LoginView.vue
- LoginWithCode.vue
- ProjectsView.vue
- ProjectWorkspaceView.vue
- UserProfileEdit.vue

### `src/views/admin/`
- AccountsAdd.vue
- AccountsEdit.vue
- AccountsView.vue
- AuditLogView.vue
- DatasetsAdd.vue
- DatasetsEdit.vue
- DatasetsSharesView.vue
- DatasetsView.vue
- HomeView.vue
- ProjectsAdd.vue
- ProjectsEdit.vue
- ProjectsView.vue
- SettingsView.vue
- StyleGuideView.vue
- TeamsAdd.vue
- TeamsEdit.vue
- TeamsView.vue
- UsageView.vue
- UsersAdd.vue
- UsersEdit.vue
- UsersView.vue

### `src/views/docs/`
- DocsView.vue

## Components (24)

### `src/components/`
- AboutModal.vue
- AdminNavBar.vue
- CopyBox.vue
- CopyCode.vue
- DocsAddNewDoc.vue
- DocsDeleteDocModal.vue
- DocsHome.vue
- DocsPageToc.vue
- DocsRefreshModal.vue
- DocsSearch.vue
- DocsSettingsModal.vue
- DocsSidebarNav.vue
- FeatureCard.vue
- MdDocEditable.vue
- NavBar.vue
- ReportIssueModal.vue
- TeamProjectSwitcher.vue

### `src/components/home/`
- DatasetCatalogCard.vue
- ProjectAdminHome.vue
- ProjectUserHome.vue

### `src/components/project/`
- ProjectAdminPanel.vue
- ProjectDatasetMasterDetail.vue
- ProjectDocsCard.vue
- ProjectUserPanel.vue

## Supporting modules

**Stores:** `stores/counter.js`, `stores/ui.js`, `stores/user.js`

**Utils:** `utils/api.js`, `utils/cards.js`, `utils/clientUsage.js`, `utils/defs.js`, `utils/docMedia.js`, `utils/docsHeadingId.js`, `utils/format.js`, `utils/fs.js`, `utils/password-validator.js`, `utils/roles.js`, `utils/toc.js`

**Composables:** `composables/useDocTypes.js`, `composables/useTeamContext.js`, `composables/useVgtTheme.js`
