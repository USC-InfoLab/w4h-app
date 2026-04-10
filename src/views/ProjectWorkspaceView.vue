<template>
  <main class="container-fluid pt-2 pb-4">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item">
          <RouterLink :to="{ name: 'studies' }">Projects</RouterLink>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          {{ projectTitle }}
        </li>
      </ol>
    </nav>

    <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
      <div>
        <h4 class="mb-0">{{ projectTitle }}</h4>
        <div class="d-flex align-items-center flex-wrap gap-2 mt-1">
          <small class="text-muted">Prepare runs, track jobs, open outputs</small>
          <span class="badge text-bg-secondary">ID: {{ id }}</span>
          <span class="badge text-bg-secondary">Selected studies: {{ selectedStudies.length }}</span>
          <span class="badge text-bg-secondary">Jobs: {{ runs.length }}</span>
          <span class="badge text-bg-secondary">Assets: {{ projectAssets.length }}</span>
          <span v-if="selectedDatasetIds.length" class="badge text-bg-secondary">Datasets: {{ selectedDatasetIds.length }}</span>
          <span v-if="user?.role" class="badge text-bg-secondary text-capitalize">Role: {{ user.role }}</span>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary" type="button" title="Project settings" @click="openSettingsModal">
          <i class="bi bi-gear" aria-hidden="true" />
          <span class="visually-hidden">Settings</span>
        </button>
        <button class="btn btn-sm btn-outline-secondary" type="button" @click="refreshProject" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" />
          Refresh
        </button>
        <button class="btn btn-sm btn-outline-primary" type="button" title="Open Jupyter or IDE URL from settings"
          @click="openIdeLaunch">
          <i class="bi bi-box-arrow-up-right me-1" /> Open IDE
        </button>
        <button class="btn btn-sm btn-primary" type="button" @click="openStartAnalysis"
          :disabled="selectedStudies.length === 0 || !canRunJobs" :title="startRunButtonTitle">
          <i class="bi bi-play-fill me-1" /> Start run
        </button>
      </div>
    </div>

    <div v-if="user?.role && !canRunJobs" class="alert alert-warning py-2 small mb-3">
      Your account role (<span class="text-capitalize">{{ user.role }}</span>) does not include launching analysis jobs.
      Access is grouped by <strong>role</strong> (admin, researcher, clinician). Contact an administrator if you need access.
    </div>

    <ul class="nav nav-tabs">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'workbench' }" type="button"
          @click="activeTab = 'workbench'">
          Workbench
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'jobs' }" type="button" @click="activeTab = 'jobs'">
          Jobs
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'outputs' }" type="button" @click="openOutputsTab">
          Outputs
        </button>
      </li>
    </ul>
    <p class="small text-muted mb-3 tab-hint border-start border-3 ps-2 py-1 ms-1 border-primary-subtle">
      <template v-if="activeTab === 'workbench'">
        Pick studies and datasets, register notebooks or scripts (path or URL), then start a run — workspace-first, not
        GitHub-first.
      </template>
      <template v-else-if="activeTab === 'jobs'">
        Each row is one analysis job: status, tool, and the payload sent (or simulated) for this project.
      </template>
      <template v-else>
        When artifact storage exists, open notebooks, tables, and logs from a selected job. Prototype only for now.
      </template>
    </p>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <section v-if="activeTab === 'workbench'">
      <div class="row g-3">
        <div class="col-12 col-lg-3">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Studies</h6>
                <span class="badge text-bg-secondary">{{ selectedStudies.length }}</span>
              </div>
              <div class="input-group input-group-sm mb-2">
                <span class="input-group-text">Search</span>
                <input v-model="studySearch" class="form-control" placeholder="Filter studies..." />
              </div>

              <div class="list-group small project-list">
                <button v-for="s in filteredStudies" :key="s.id" type="button"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  :class="{ active: selectedStudyIdsSet.has(s.id) }" @click="toggleStudy(s.id)">
                  <span class="text-truncate">{{ s.name || s.id }}</span>
                  <span class="badge text-bg-light">{{ s.id }}</span>
                </button>
              </div>

              <div v-if="!loading && studies.length === 0" class="text-muted small mt-2">
                No studies available for this account.
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-body">
              <div class="mb-3">
                <h6 class="mb-0">Notebooks &amp; scripts</h6>
                <small class="text-muted">Workspace entrypoints (notebook, R, or shell) as file path or URL — not
                  GitHub-first.</small>
              </div>

              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0 small text-uppercase text-muted">Selected studies</h6>
                <span class="badge text-bg-secondary">
                  {{ selectedStudies.length }} / {{ studies.length }}
                </span>
              </div>
              <div v-if="selectedStudies.length === 0" class="text-muted small">
                Select one or more studies before starting a run.
              </div>
              <div v-else class="d-flex flex-wrap gap-2">
                <span v-for="s in selectedStudies" :key="s.id" class="badge rounded-pill text-bg-primary">
                  {{ s.name || s.id }}
                  <button type="button" class="btn-close btn-close-white ms-2" aria-label="Remove"
                    @click="toggleStudy(s.id)" />
                </span>
              </div>

              <hr class="my-3" />

              <h6 class="mb-2 small text-uppercase text-muted">Sample templates</h6>
              <p class="small text-muted mb-2">Add a starter asset to your project (placeholders until backend templates
                exist).</p>
              <div class="vstack gap-2 mb-3">
                <div v-for="tpl in sampleAssetTemplates" :key="tpl.templateId"
                  class="d-flex justify-content-between gap-2 align-items-start border rounded p-2">
                  <div class="small">
                    <div class="fw-semibold">{{ tpl.name }}</div>
                    <div class="text-muted">{{ tpl.description }}</div>
                  </div>
                  <button type="button" class="btn btn-sm btn-outline-primary text-nowrap flex-shrink-0"
                    @click="addSampleAsset(tpl)">
                    Add
                  </button>
                </div>
              </div>

              <h6 class="mb-2 small text-uppercase text-muted">Your project assets</h6>
              <div v-if="projectAssets.length === 0" class="text-muted small mb-2">
                No assets yet. Add a sample above or register a file path / URL below.
              </div>
              <div v-else class="list-group small mb-3">
                <button v-for="a in projectAssets" :key="a.id" type="button"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  :class="{ active: selectedAssetId === a.id }" @click="selectAsset(a.id)">
                  <span class="text-truncate">{{ a.name }}</span>
                  <span class="badge text-bg-light ms-1">{{ assetKindLabel(a.kind) }}</span>
                </button>
              </div>

              <h6 class="mb-2 small text-uppercase text-muted">Register file or URL</h6>
              <div class="row g-2">
                <div class="col-12">
                  <input v-model="newAssetForm.name" class="form-control form-control-sm" placeholder="Display name" />
                </div>
                <div class="col-6">
                  <select v-model="newAssetForm.kind" class="form-select form-select-sm">
                    <option value="notebook">Notebook</option>
                    <option value="r">R script</option>
                    <option value="shell">Shell script</option>
                  </select>
                </div>
                <div class="col-6">
                  <select v-model="newAssetForm.sourceType" class="form-select form-select-sm">
                    <option value="url">URL</option>
                    <option value="file">File path</option>
                  </select>
                </div>
                <div class="col-12">
                  <input v-model="newAssetForm.uri" class="form-control form-control-sm font-monospace"
                    placeholder="https://… or /path/to/notebook.ipynb" />
                </div>
                <div class="col-12">
                  <input v-model="newAssetForm.notes" class="form-control form-control-sm" placeholder="Notes (optional)" />
                </div>
                <div class="col-12">
                  <button type="button" class="btn btn-sm btn-primary" :disabled="!canAddUserAsset" @click="addUserAsset">
                    Add asset
                  </button>
                </div>
              </div>

              <hr class="my-3" />

              <h6 class="mb-2 small text-uppercase text-muted">Datasets</h6>
              <p class="small text-muted mb-2">
                Datasets you can access (from the API). With studies selected, the list is scoped to those studies when
                possible.
              </p>
              <div class="input-group input-group-sm mb-2">
                <span class="input-group-text">Search</span>
                <input v-model="datasetSearch" class="form-control" placeholder="Filter by name or id..." />
              </div>
              <div v-if="datasetsLoading" class="text-muted small">Loading datasets…</div>
              <div v-else-if="datasetsLoadError" class="alert alert-warning py-2 small mb-2">{{ datasetsLoadError }}</div>
              <div v-else-if="projectDatasets.length === 0" class="text-muted small">
                No datasets returned for your account.
              </div>
              <div v-else-if="datasetsDisplayedList.length === 0" class="text-muted small">
                No datasets match the current study selection and search.
              </div>
              <div v-else class="table-responsive dataset-table-wrap border rounded mb-2">
                <table class="table table-sm table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th class="text-center" style="width: 2.25rem" scope="col"><span class="visually-hidden">Select</span></th>
                      <th scope="col">Name</th>
                      <th scope="col">Description</th>
                      <th scope="col">ID</th>
                      <th scope="col">Study</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="d in datasetsDisplayedList" :key="d.id">
                      <td class="text-center">
                        <input class="form-check-input" type="checkbox" :checked="selectedDatasetIdsSet.has(d.id)"
                          :aria-label="`Select dataset ${d.name || d.id}`" @change="toggleDatasetSelection(d.id)" />
                      </td>
                      <td class="text-truncate" style="max-width: 200px">{{ d.name || '—' }}</td>
                      <td class="small text-muted text-truncate" style="max-width: 220px" :title="d.description || ''">
                        {{ d.description || '—' }}
                      </td>
                      <td><code class="small text-break d-block" style="max-width: 12rem">{{ d.id }}</code></td>
                      <td>
                        <span v-if="d.study_id" class="badge text-bg-light">{{ d.study_id }}</span>
                        <span v-else class="text-muted">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="d-flex flex-wrap gap-2 align-items-center small text-muted mb-3">
                <span>{{ selectedDatasetIds.length }} dataset(s) pinned for new runs</span>
                <button v-if="selectedDatasetIds.length" type="button" class="btn btn-link btn-sm p-0"
                  @click="clearDatasetSelection">
                  Clear selection
                </button>
              </div>

              <button type="button"
                class="btn btn-sm btn-outline-secondary w-100 d-flex justify-content-between align-items-center text-start"
                @click="wranglerSectionOpen = !wranglerSectionOpen">
                <span class="small fw-semibold">Data wrangler <span class="fw-normal text-muted">(optional preview)</span></span>
                <i class="bi" :class="wranglerSectionOpen ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true" />
              </button>
              <div v-show="wranglerSectionOpen" class="mt-2">
                <p class="small text-muted mb-2">Paste a small CSV to inspect columns locally — no upload, not saved.</p>
                <textarea v-model="wranglerRaw" class="form-control form-control-sm font-monospace mb-2" rows="4"
                  placeholder="id,value&#10;a,1&#10;b,2"></textarea>
                <button type="button" class="btn btn-sm btn-outline-secondary mb-2 me-2" @click="parseWranglerCsv">
                  Preview table
                </button>
                <button v-if="wranglerPreview" type="button" class="btn btn-sm btn-link text-muted mb-2"
                  @click="clearWranglerPreview">
                  Clear preview
                </button>
                <div v-if="wranglerPreview" class="border rounded wrangler-preview">
                  <table class="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th v-for="h in wranglerPreview.headers" :key="h" class="text-nowrap small">{{ h }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in wranglerPreview.rows" :key="ri">
                        <td v-for="(cell, ci) in row" :key="ci" class="small text-truncate" style="max-width: 140px;">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="wranglerPreview" class="small text-muted mt-1">
                  Showing up to 10 rows · {{ wranglerPreview.rowCount }} data row(s) detected
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="mb-2">Asset details</h6>
              <div v-if="!selectedAsset" class="text-muted small">
                Select a notebook or script in the list, or add one from samples.
              </div>
              <div v-else>
                <div class="small mb-2"><strong>Name:</strong> {{ selectedAsset.name }}</div>
                <div class="small mb-2"><strong>Kind:</strong> {{ assetKindLabel(selectedAsset.kind) }}</div>
                <div class="small mb-2"><strong>Source:</strong> {{ selectedAsset.sourceType === 'url' ? 'URL' : 'File path' }}
                </div>
                <div class="small mb-2 text-break">
                  <strong>URI:</strong> <code class="small user-select-all">{{ selectedAsset.uri }}</code>
                </div>
                <div v-if="selectedAsset.notes" class="small mb-2 text-muted">{{ selectedAsset.notes }}</div>
                <button type="button" class="btn btn-sm btn-outline-danger" @click="removeAsset(selectedAsset.id)">
                  Remove from project
                </button>
              </div>
              <hr class="my-3" />
              <small class="text-muted d-block">
                Asset metadata is stored in this browser until the API persists it.
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'jobs'">
      <div class="row g-3">
        <div class="col-12 col-xl-8">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <h6 class="mb-0">Jobs</h6>
                  <small class="text-muted">Runs / analyses for this project (status &amp; payload)</small>
                </div>
                <button class="btn btn-sm btn-outline-secondary" type="button" @click="clearRuns" :disabled="runs.length === 0">
                  Clear
                </button>
              </div>

              <div class="row g-2 mb-2">
                <div class="col-md-4">
                  <input v-model="monitorSearch" class="form-control form-control-sm" placeholder="Search job name..." />
                </div>
                <div class="col-md-2">
                  <select v-model="monitorStatus" class="form-select form-select-sm">
                    <option value="">All status</option>
                    <option value="queued">Queued</option>
                    <option value="running">Running</option>
                    <option value="done">Done</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <select v-model="monitorTool" class="form-select form-select-sm">
                    <option value="">All tools</option>
                    <option value="JupyterLab">JupyterLab</option>
                    <option value="RStudio">RStudio</option>
                    <option value="Script/Docker">Script/Docker</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <select v-model="monitorCompute" class="form-select form-select-sm">
                    <option value="">All compute</option>
                    <option value="local">Local</option>
                    <option value="spark">Spark</option>
                    <option value="databricks">Databricks</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button class="btn btn-sm btn-outline-secondary w-100" type="button" @click="resetMonitorFilters">
                    Reset
                  </button>
                </div>
              </div>

              <div v-if="runs.length === 0" class="text-muted">
                No jobs yet. Use <strong>Start run</strong> in the header after selecting studies on Workbench.
              </div>

              <div v-else-if="filteredRuns.length === 0" class="text-muted">
                No runs match the current filters.
              </div>

              <div v-else class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>
                        <button class="btn btn-link btn-sm p-0 table-sort-btn" type="button" @click="setRunSort('name')">
                          Name
                          <i v-if="runSortBy === 'name'" class="bi ms-1" :class="sortIconClass('name')"></i>
                        </button>
                      </th>
                      <th>Status</th>
                      <th>Tool</th>
                      <th>Compute</th>
                      <th>Asset</th>
                      <th>Datasets</th>
                      <th>Studies</th>
                      <th>Source</th>
                      <th>
                        <button class="btn btn-link btn-sm p-0 table-sort-btn" type="button" @click="setRunSort('createdAt')">
                          Created
                          <i v-if="runSortBy === 'createdAt'" class="bi ms-1" :class="sortIconClass('createdAt')"></i>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in filteredRuns" :key="r.id" role="button"
                      :class="{ 'table-active': selectedRun?.id === r.id }" @click="selectRun(r)">
                      <td class="text-truncate" style="max-width: 260px;">
                        {{ r.name }}
                      </td>
                      <td>
                        <span class="badge" :class="statusBadgeClass(r.status)">
                          {{ r.status }}
                        </span>
                      </td>
                      <td>{{ r.tool }}</td>
                      <td class="text-muted small">{{ computeTargetLabel(r.computeTarget) }}</td>
                      <td class="text-muted text-truncate" style="max-width: 140px;"
                        :title="r.notebookName || r.notebookUri || ''">
                        {{ r.notebookName || '—' }}
                      </td>
                      <td class="text-muted">{{ r.datasetIds?.length ? r.datasetIds.length : '—' }}</td>
                      <td>{{ r.studyIds?.length || 0 }}</td>
                      <td class="text-muted">{{ r.source || 'local' }}</td>
                      <td class="text-muted">{{ formatDateTime(r.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-4">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Job details</h6>
                <div v-if="selectedRun" class="dropdown">
                  <button ref="runActionsToggleEl" type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle"
                    data-bs-toggle="dropdown" aria-expanded="false">
                    Actions
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                      <button class="dropdown-item" type="button" @click="duplicateRun(selectedRun)">
                        <i class="bi bi-files me-2"></i>Duplicate
                      </button>
                    </li>
                    <li>
                      <button class="dropdown-item" type="button" @click="openEditRun(selectedRun)">
                        <i class="bi bi-pencil me-2"></i>Edit
                      </button>
                    </li>
                    <li><hr class="dropdown-divider" /></li>
                    <li>
                      <button class="dropdown-item text-danger" type="button" @click="openDeleteRun(selectedRun)">
                        <i class="bi bi-trash me-2"></i>Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

              <div v-if="!selectedRun" class="text-muted">
                Select a job to see status, studies, datasets, and payload.
              </div>

              <div v-else>
                <div class="small"><strong>Name:</strong> {{ selectedRun.name }}</div>
                <div class="small"><strong>Status:</strong> {{ selectedRun.status }}</div>
                <div class="small"><strong>Tool:</strong> {{ selectedRun.tool }}</div>
                <div class="small"><strong>Compute:</strong> {{ computeTargetLabel(selectedRun.computeTarget) }}</div>
                <div class="small"><strong>Project:</strong> {{ selectedRun.projectId || id }}</div>
                <div class="small"><strong>Created:</strong> {{ formatDateTime(selectedRun.createdAt) }}</div>
                <div class="small mb-2"><strong>Source:</strong> {{ selectedRun.source || 'local' }}</div>

                <div v-if="selectedRun.notebookName || selectedRun.notebookUri" class="small mb-2">
                  <div class="fw-semibold mb-1">Notebook / script</div>
                  <div v-if="selectedRun.notebookName"><strong>Name:</strong> {{ selectedRun.notebookName }}</div>
                  <div v-if="selectedRun.notebookKind" class="text-muted">Kind: {{ assetKindLabel(selectedRun.notebookKind) }}</div>
                  <div v-if="selectedRun.notebookUri" class="text-break"><code class="small">{{ selectedRun.notebookUri }}</code></div>
                  <div v-if="selectedRun.externalJupyterUrl" class="mt-1 text-muted">
                    External Jupyter: {{ selectedRun.externalJupyterUrl }}
                  </div>
                </div>

                <div v-if="selectedRun.datasetIds?.length" class="small mb-2">
                  <div class="fw-semibold mb-1">Dataset IDs</div>
                  <div class="d-flex flex-wrap gap-1">
                    <span v-for="did in selectedRun.datasetIds" :key="did" class="badge text-bg-secondary">{{ did }}</span>
                  </div>
                </div>

                <div class="small fw-semibold mb-1">Study IDs</div>
                <div v-if="!selectedRun.studyIds?.length" class="text-muted small mb-2">
                  No studies attached.
                </div>
                <div v-else class="d-flex flex-wrap gap-1 mb-2">
                  <span v-for="sid in selectedRun.studyIds" :key="sid" class="badge text-bg-secondary">{{ sid }}</span>
                </div>

                <div class="small fw-semibold mb-1">Payload preview</div>
                <pre class="payload-preview mb-0">{{ selectedRunPayloadPreview }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'outputs'">
      <div class="row g-3">
        <div class="col-12 col-lg-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="mb-2">Workspace viewers</h6>

              <div class="list-group small">
                <button v-for="viewer in viewers" :key="viewer.id" type="button"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  :class="{ active: selectedViewer?.id === viewer.id }" @click="selectViewer(viewer.id)">
                  <span class="text-truncate">{{ viewer.name }}</span>
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>

              <div class="alert alert-light border mt-3 mb-0">
                <small>
                  Only run trusted viewers on validated outputs.
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-9">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Outputs</h6>
                <button class="btn btn-sm btn-outline-secondary" type="button" @click="activeTab = 'jobs'">
                  Open Jobs
                </button>
              </div>

              <div class="mb-3">
                <label class="form-label">Job to attach outputs to</label>
                <select v-model="selectedVisualizeRunId" class="form-select form-select-sm">
                  <option v-if="visualizeRunOptions.length === 0" value="">No jobs yet</option>
                  <option v-for="run in visualizeRunOptions" :key="run.id" :value="run.id">
                    {{ run.name }} ({{ run.status }}) - {{ formatDateTime(run.createdAt) }}
                  </option>
                </select>
                <small class="text-muted">
                  Same selection as the Jobs tab. Artifact files will list here once the API is wired.
                </small>
              </div>

              <div v-if="selectedViewer" class="border rounded p-3 mb-3">
                <div class="d-flex align-items-start justify-content-between gap-2">
                  <div>
                    <div class="fw-semibold">{{ selectedViewer.name }}</div>
                    <div class="text-muted small">{{ selectedViewer.description }}</div>
                    <div class="text-muted small mt-1">
                      Supported: {{ selectedViewer.supported }}
                    </div>
                    <div class="text-muted small mt-1">
                      Run: {{ selectedVisualizeRun?.name || 'none selected' }}
                    </div>
                  </div>
                  <button class="btn btn-sm btn-primary" type="button" disabled title="Coming soon">
                    Select run output (coming soon)
                  </button>
                </div>
              </div>

              <div class="alert alert-light border mb-0">
                <small>
                  Output browser is a UI placeholder: no artifact listing until backend storage is implemented.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="modal fade" tabindex="-1" ref="settingsModalEl" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Project settings</h5>
            <button type="button" class="btn-close" @click="closeSettingsModal" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Project ID</label>
                <input class="form-control" :value="id" disabled />
              </div>
              <div class="col-md-6">
                <label class="form-label">Display name (local)</label>
                <input v-model="localProjectName" class="form-control" placeholder="Optional name just for this browser" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Default launch tool</label>
                <select v-model="workspaceSettings.defaultTool" class="form-select">
                  <option value="JupyterLab">JupyterLab</option>
                  <option value="RStudio">RStudio</option>
                  <option value="Script/Docker">Script/Docker</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Run name prefix (optional)</label>
                <input v-model="workspaceSettings.runNamePrefix" class="form-control" placeholder="e.g. cohort-" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Default compute target</label>
                <select v-model="workspaceSettings.defaultComputeTarget" class="form-select">
                  <option value="local">Local</option>
                  <option value="spark">Apache Spark</option>
                  <option value="databricks">Databricks</option>
                </select>
                <small class="text-muted">Sent on each job payload; execution is wired up by the backend.</small>
              </div>
              <div class="col-12">
                <label class="form-label">Default external Jupyter base URL (optional)</label>
                <input v-model="workspaceSettings.defaultExternalJupyterUrl" class="form-control font-monospace"
                  placeholder="https://your-jupyter.example.org" />
                <small class="text-muted">Prefills the start-run modal; <strong>Open IDE</strong> uses this URL.</small>
              </div>
              <div class="col-12">
                <label class="form-label">Preferred API key scope (team default)</label>
                <select v-model="workspaceSettings.apiKeyScope" class="form-select">
                  <option value="project">Project-scoped API key</option>
                  <option value="user">User-scoped API key</option>
                </select>
                <small class="text-muted">Backend will issue short-lived DB credentials after validating the key; this preference is
                  stored locally until the API supports it.</small>
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input id="settings-autoOpenJobs" v-model="workspaceSettings.autoOpenMonitorOnStart"
                    class="form-check-input" type="checkbox" />
                  <label for="settings-autoOpenJobs" class="form-check-label">
                    Auto-open Jobs tab after starting a run
                  </label>
                </div>
              </div>
            </div>

            <hr class="my-4" />
            <h6 class="text-muted text-uppercase small mb-2">Privacy &amp; metadata (platform direction)</h6>
            <ul class="small text-muted mb-3">
              <li>Do not paste identifiable patient data into the wrangler or notebook URLs. This UI stores some workspace state in
                the browser for prototyping.</li>
              <li>Production access uses <strong>roles</strong> as permission groups; dataset access is enforced server-side and
                mapped to database ACLs.</li>
              <li>Dataset and column documentation will live in <strong>Postgres metadata</strong> (including COMMENTs) and surface
                through the API.</li>
            </ul>
            <div class="alert alert-light border small mb-0">
              <strong>API → database:</strong> client uses an API key → backend validates → issues <strong>short-lived</strong>
              credentials → app connects with the Postgres driver. Exact key scope (user vs project) is a backend decision; the
              preference above matches team discussion.
            </div>

            <small class="text-muted d-block mt-3">
              Stored in this browser for this project until the API persists workspace metadata.
            </small>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="resetSettings">Reset</button>
            <button type="button" class="btn btn-primary" @click="saveSettings">Save</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" tabindex="-1" ref="startModalEl" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Start analysis run</h5>
            <button type="button" class="btn-close" @click="closeStartAnalysis" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div v-if="selectedStudies.length === 0" class="alert alert-warning">
              Select at least one study on <strong>Workbench</strong> before starting a run.
            </div>

            <p class="small text-muted mb-3">
              Choose how this job runs: Jupyter notebook, RStudio, or a shell script. Optionally bind a registered asset
              (file path or URL).
            </p>

            <div class="mb-3">
              <label class="form-label">Environment</label>
              <select v-model="newRun.tool" class="form-select">
                <option value="JupyterLab">Jupyter notebook (JupyterLab)</option>
                <option value="RStudio">R (RStudio)</option>
                <option value="Script/Docker">Shell script</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Compute target</label>
              <select v-model="newRun.computeTarget" class="form-select">
                <option value="local">Local</option>
                <option value="spark">Apache Spark</option>
                <option value="databricks">Databricks</option>
              </select>
              <small class="text-muted">Where heavy processing runs; backend orchestration to be connected.</small>
            </div>

            <div class="mb-3">
              <label class="form-label">Notebook / script (optional)</label>
              <select v-model="newRun.notebookAssetId" class="form-select">
                <option value="">None — no asset bound to this run</option>
                <option v-for="a in projectAssets" :key="a.id" :value="a.id">
                  {{ a.name }} ({{ assetKindLabel(a.kind) }})
                </option>
              </select>
              <small class="text-muted">Register assets on <strong>Workbench</strong> (samples, file path, or URL).</small>
            </div>

            <div v-if="newRun.tool === 'JupyterLab'" class="mb-3">
              <label class="form-label">External Jupyter base URL (optional)</label>
              <input v-model="newRun.externalJupyterUrl" class="form-control font-monospace"
                placeholder="https://your-jupyter.example.org" />
              <small class="text-muted">Use when the notebook runs on an external hub; stored on this run for tracking.</small>
            </div>

            <div class="mb-3">
              <label class="form-label">Run name</label>
              <input v-model="newRun.name" class="form-control" placeholder="e.g. cohort-selection" />
              <small class="text-muted">Shown in Jobs; a default is used if empty.</small>
            </div>

            <div class="alert alert-light border mb-3">
              <div><strong>Project:</strong> {{ id }}</div>
              <div><strong>Studies selected:</strong> {{ selectedStudies.length }}</div>
              <div><strong>Datasets pinned:</strong> {{ selectedDatasetIds.length }} (from Workbench)</div>
            </div>

            <div class="alert alert-info mb-0 small">
              The app calls the backend launch API when available; otherwise it simulates a run locally.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeStartAnalysis">Cancel</button>
            <button type="button" class="btn btn-primary" @click="createRun" :disabled="selectedStudies.length === 0">
              Start run
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" tabindex="-1" ref="editRunModalEl" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit job</h5>
            <button type="button" class="btn-close" @click="closeEditRun" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Job name</label>
              <input v-model="editRunForm.name" class="form-control" placeholder="Job name" />
            </div>
            <div class="mb-2">
              <label class="form-label">Tool</label>
              <select v-model="editRunForm.tool" class="form-select">
                <option value="JupyterLab">JupyterLab</option>
                <option value="RStudio">RStudio</option>
                <option value="Script/Docker">Script/Docker</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label">Compute target</label>
              <select v-model="editRunForm.computeTarget" class="form-select">
                <option value="local">Local</option>
                <option value="spark">Apache Spark</option>
                <option value="databricks">Databricks</option>
              </select>
            </div>
            <small class="text-muted">Status and study selection are immutable in this phase.</small>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeEditRun">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveRunEdits" :disabled="!editRunTargetId">
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" tabindex="-1" ref="deleteRunModalEl" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Delete job</h5>
            <button type="button" class="btn-close" @click="closeDeleteRun" aria-label="Close" />
          </div>
          <div class="modal-body">
            <p class="mb-2">Are you sure you want to delete this job?</p>
            <div class="alert alert-light border mb-0">
              <strong>{{ deleteRunTarget?.name || 'Job' }}</strong>
              <div class="text-muted small">This cannot be undone.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeDeleteRun">Cancel</button>
            <button type="button" class="btn btn-danger" @click="confirmDeleteRun" :disabled="!deleteRunTarget">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Dropdown, Modal } from 'bootstrap';

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const RUN_JOB_ROLES = new Set(['admin', 'researcher', 'clinician']);

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const sampleAssetTemplates = [
  {
    templateId: 'sample-ukb-qc',
    name: 'QC overview (sample)',
    kind: 'notebook',
    description: 'Row counts, missingness, and key fields.',
    uri: 'https://example.org/w4h/samples/ukb-qc-overview.ipynb'
  },
  {
    templateId: 'sample-cohort',
    name: 'Cohort selection (sample)',
    kind: 'notebook',
    description: 'Inclusion / exclusion from phenotypes.',
    uri: 'https://example.org/w4h/samples/cohort-selection.ipynb'
  },
  {
    templateId: 'sample-r-describe',
    name: 'R summary table (sample)',
    kind: 'r',
    description: 'Descriptive statistics starter script.',
    uri: 'https://example.org/w4h/samples/describe.R'
  }
];

const router = useRouter();
const route = useRoute();
const id = computed(() => String(route.params.id || ''));

const loading = ref(false);
const errorMessage = ref('');
const studies = ref([]);
const projectDatasets = ref([]);
const datasetsLoading = ref(false);
const datasetsLoadError = ref('');
const datasetSearch = ref('');
const selectedDatasetIds = ref([]);
const wranglerRaw = ref('');
const wranglerPreview = ref(null);
const wranglerSectionOpen = ref(false);
const activeTab = ref('workbench');
const studySearch = ref('');

const localProjectName = ref('');

const settingsModalEl = ref(null);
let settingsModal = null;
const startModalEl = ref(null);
let startModal = null;
const editRunModalEl = ref(null);
let editRunModal = null;
const deleteRunModalEl = ref(null);
let deleteRunModal = null;
const runActionsToggleEl = ref(null);

const newRun = ref({
  tool: 'JupyterLab',
  name: '',
  notebookAssetId: '',
  externalJupyterUrl: '',
  computeTarget: 'local'
});
const runs = ref([]);
const projectAssets = ref([]);
const selectedAssetId = ref('');
const newAssetForm = ref({
  name: '',
  kind: 'notebook',
  sourceType: 'url',
  uri: '',
  notes: ''
});
const selectedRunId = ref('');
const monitorSearch = ref('');
const monitorStatus = ref('');
const monitorTool = ref('');
const monitorCompute = ref('');
const runSortBy = ref('createdAt');
const runSortDir = ref('desc');
const viewers = ref([
  {
    id: 'notebook',
    name: 'Jupyter Notebook Preview',
    description: 'Open and preview notebook outputs linked to a run.',
    supported: '.ipynb'
  },
  {
    id: 'table',
    name: 'Table/Data Preview',
    description: 'Preview CSV/TSV/parquet style tabular outputs.',
    supported: '.csv, .tsv, .parquet'
  },
  {
    id: 'file',
    name: 'General File Viewer',
    description: 'Inspect logs and text outputs from analyses.',
    supported: '.txt, .log, .json'
  }
]);
const selectedViewerId = ref('notebook');
const selectedVisualizeRunId = ref('');
const workspaceSettings = ref({
  defaultTool: 'JupyterLab',
  runNamePrefix: '',
  defaultExternalJupyterUrl: '',
  defaultComputeTarget: 'local',
  /** Preferred API key scope for automation (backend TBD): user-scoped vs project-scoped */
  apiKeyScope: 'project',
  autoOpenMonitorOnStart: true
});

const selectedStudyIds = ref([]);
const selectedStudyIdsSet = computed(() => new Set(selectedStudyIds.value));
const selectedDatasetIdsSet = computed(() => new Set(selectedDatasetIds.value));
const selectedStudies = computed(() => studies.value.filter(s => selectedStudyIdsSet.value.has(s.id)));
const datasetsDisplayedList = computed(() => {
  const q = datasetSearch.value.trim().toLowerCase();
  let list = projectDatasets.value;
  if (selectedStudyIds.value.length > 0) {
    list = list.filter(d => selectedStudyIdsSet.value.has(d.study_id));
  }
  if (!q) return list;
  return list.filter(
    d =>
      String(d.name || '')
        .toLowerCase()
        .includes(q) || String(d.id || '').toLowerCase().includes(q)
  );
});
const selectedRun = computed(() => runs.value.find(r => r.id === selectedRunId.value) || null);
const selectedAsset = computed(() => projectAssets.value.find(a => a.id === selectedAssetId.value) || null);
const canAddUserAsset = computed(() => {
  const name = (newAssetForm.value.name || '').trim();
  const uri = (newAssetForm.value.uri || '').trim();
  return Boolean(name && uri);
});

const filteredRuns = computed(() => {
  const q = monitorSearch.value.trim().toLowerCase();
  const result = runs.value.filter((r) => {
    if (monitorStatus.value && r.status !== monitorStatus.value) return false;
    if (monitorTool.value && r.tool !== monitorTool.value) return false;
    if (monitorCompute.value) {
      const ct = r.computeTarget || 'local';
      if (ct !== monitorCompute.value) return false;
    }
    if (q && !String(r.name || '').toLowerCase().includes(q)) return false;
    return true;
  });

  result.sort((a, b) => compareRuns(a, b, runSortBy.value, runSortDir.value));
  return result;
});

const selectedRunPayloadPreview = computed(() => {
  if (!selectedRun.value) return '';
  const r = selectedRun.value;
  const payload = {
    projectId: r.projectId || id.value,
    name: r.name,
    tool: r.tool,
    studyIds: r.studyIds || []
  };
  if (r.notebookAssetId) payload.notebookAssetId = r.notebookAssetId;
  if (r.notebookUri) payload.notebookUri = r.notebookUri;
  if (r.notebookKind) payload.notebookKind = r.notebookKind;
  if (r.notebookName) payload.notebookName = r.notebookName;
  if (r.externalJupyterUrl) payload.externalJupyterUrl = r.externalJupyterUrl;
  if (Array.isArray(r.datasetIds) && r.datasetIds.length) payload.datasetIds = r.datasetIds;
  if (r.computeTarget) payload.computeTarget = r.computeTarget;
  return JSON.stringify(payload, null, 2);
});
const selectedViewer = computed(() => viewers.value.find(v => v.id === selectedViewerId.value) || null);
const visualizeRunOptions = computed(() =>
  [...runs.value].sort((a, b) => compareRuns(a, b, 'createdAt', 'desc'))
);
const selectedVisualizeRun = computed(() =>
  runs.value.find(r => r.id === selectedVisualizeRunId.value) || null
);
const editRunTargetId = ref('');
const editRunForm = ref({ name: '', tool: 'JupyterLab', computeTarget: 'local' });
const deleteRunTargetId = ref('');
const deleteRunTarget = computed(() => runs.value.find(r => r.id === deleteRunTargetId.value) || null);

const projectTitle = computed(() => localProjectName.value?.trim() || id.value || 'Project');

const canRunJobs = computed(() => {
  const r = user.value?.role;
  if (!r) return true;
  return RUN_JOB_ROLES.has(r);
});

const ideLaunchUrl = computed(() => String(workspaceSettings.value.defaultExternalJupyterUrl || '').trim());

const startRunButtonTitle = computed(() => {
  if (!canRunJobs.value) return 'Your role cannot start analysis jobs';
  if (selectedStudies.value.length === 0) return 'Select at least one study';
  return 'Start a new analysis job';
});

function computeTargetLabel(value) {
  const v = value || 'local';
  if (v === 'spark') return 'Spark';
  if (v === 'databricks') return 'Databricks';
  return 'Local';
}

function openIdeLaunch() {
  const url = ideLaunchUrl.value;
  if (!url) {
    openSettingsModal();
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function storageKey(suffix) {
  return `w4h.project.${id.value}.${suffix}`;
}

function newAssetId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeLoadedAsset(row) {
  if (!row || typeof row !== 'object') return null;
  const aid = String(row.id || '').trim();
  const uri = String(row.uri || '').trim();
  if (!aid || !uri) return null;
  return {
    id: aid,
    name: String(row.name || 'Untitled').slice(0, 200),
    kind: ['notebook', 'r', 'shell'].includes(row.kind) ? row.kind : 'notebook',
    sourceType: row.sourceType === 'file' ? 'file' : 'url',
    uri: uri.slice(0, 2000),
    notes: String(row.notes || '').slice(0, 500),
    sampleTemplateId: row.sampleTemplateId || undefined
  };
}

function assetKindLabel(kind) {
  if (kind === 'notebook') return 'Notebook';
  if (kind === 'r') return 'R';
  if (kind === 'shell') return 'Shell';
  return String(kind || '');
}

function persistAssets() {
  localStorage.setItem(storageKey('assets'), JSON.stringify(projectAssets.value));
}

function addSampleAsset(tpl) {
  projectAssets.value = [
    ...projectAssets.value,
    {
      id: newAssetId(),
      name: tpl.name,
      kind: tpl.kind,
      sourceType: 'url',
      uri: tpl.uri,
      notes: tpl.description,
      sampleTemplateId: tpl.templateId
    }
  ];
  persistAssets();
}

function removeAsset(assetId) {
  projectAssets.value = projectAssets.value.filter(a => a.id !== assetId);
  if (selectedAssetId.value === assetId) selectedAssetId.value = '';
  persistAssets();
}

function addUserAsset() {
  if (!canAddUserAsset.value) return;
  const name = (newAssetForm.value.name || '').trim();
  const uri = (newAssetForm.value.uri || '').trim();
  projectAssets.value = [
    ...projectAssets.value,
    {
      id: newAssetId(),
      name,
      kind: newAssetForm.value.kind,
      sourceType: newAssetForm.value.sourceType,
      uri,
      notes: (newAssetForm.value.notes || '').trim()
    }
  ];
  newAssetForm.value = { name: '', kind: 'notebook', sourceType: 'url', uri: '', notes: '' };
  persistAssets();
}

function loadLocalState() {
  try {
    const name = localStorage.getItem(storageKey('name')) || '';
    localProjectName.value = name;
  } catch {
    localProjectName.value = '';
  }

  try {
    const raw = localStorage.getItem(storageKey('selectedStudies'));
    selectedStudyIds.value = raw ? JSON.parse(raw) : [];
  } catch {
    selectedStudyIds.value = [];
  }

  try {
    const raw = localStorage.getItem(storageKey('runs'));
    runs.value = raw ? JSON.parse(raw) : [];
    if (runs.value.length > 0) {
      selectedRunId.value = runs.value[0].id;
      selectedVisualizeRunId.value = runs.value[0].id;
    } else {
      selectedRunId.value = '';
      selectedVisualizeRunId.value = '';
    }
  } catch {
    runs.value = [];
    selectedRunId.value = '';
    selectedVisualizeRunId.value = '';
  }

  try {
    const raw = localStorage.getItem(storageKey('settings'));
    const parsed = raw ? JSON.parse(raw) : {};
    workspaceSettings.value = {
      defaultTool: parsed.defaultTool || 'JupyterLab',
      runNamePrefix: parsed.runNamePrefix || '',
      defaultExternalJupyterUrl: String(parsed.defaultExternalJupyterUrl || '').trim(),
      defaultComputeTarget: ['local', 'spark', 'databricks'].includes(parsed.defaultComputeTarget)
        ? parsed.defaultComputeTarget
        : 'local',
      apiKeyScope: parsed.apiKeyScope === 'user' ? 'user' : 'project',
      autoOpenMonitorOnStart: parsed.autoOpenMonitorOnStart !== false
    };
  } catch {
    workspaceSettings.value = {
      defaultTool: 'JupyterLab',
      runNamePrefix: '',
      defaultExternalJupyterUrl: '',
      defaultComputeTarget: 'local',
      apiKeyScope: 'project',
      autoOpenMonitorOnStart: true
    };
  }

  try {
    const raw = localStorage.getItem(storageKey('assets'));
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed.map(sanitizeLoadedAsset).filter(Boolean) : [];
    projectAssets.value = list;
    if (selectedAssetId.value && !list.some(a => a.id === selectedAssetId.value)) {
      selectedAssetId.value = '';
    }
  } catch {
    projectAssets.value = [];
    selectedAssetId.value = '';
  }

  try {
    const raw = localStorage.getItem(storageKey('selectedDatasets'));
    const parsed = raw ? JSON.parse(raw) : [];
    selectedDatasetIds.value = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    selectedDatasetIds.value = [];
  }
}

function persistSelectedStudies() {
  localStorage.setItem(storageKey('selectedStudies'), JSON.stringify(selectedStudyIds.value));
}

function persistRuns() {
  localStorage.setItem(storageKey('runs'), JSON.stringify(runs.value));
}

function persistSelectedDatasets() {
  localStorage.setItem(storageKey('selectedDatasets'), JSON.stringify(selectedDatasetIds.value));
}

function toggleDatasetSelection(datasetId) {
  const sid = String(datasetId || '');
  if (!sid) return;
  const next = new Set(selectedDatasetIds.value);
  if (next.has(sid)) next.delete(sid);
  else next.add(sid);
  selectedDatasetIds.value = Array.from(next);
  persistSelectedDatasets();
}

function clearDatasetSelection() {
  selectedDatasetIds.value = [];
  persistSelectedDatasets();
}

function parseWranglerLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === ',') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function clearWranglerPreview() {
  wranglerPreview.value = null;
}

function parseWranglerCsv() {
  const text = (wranglerRaw.value || '').trim();
  if (!text) {
    wranglerPreview.value = null;
    return;
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) {
    wranglerPreview.value = null;
    return;
  }
  const headers = parseWranglerLine(lines[0]);
  const rows = lines.slice(1, 11).map(parseWranglerLine);
  wranglerPreview.value = {
    headers,
    rows,
    rowCount: Math.max(0, lines.length - 1)
  };
}

function selectRun(run) {
  selectedRunId.value = run?.id || '';
}

function resetMonitorFilters() {
  monitorSearch.value = '';
  monitorStatus.value = '';
  monitorTool.value = '';
  monitorCompute.value = '';
  runSortBy.value = 'createdAt';
  runSortDir.value = 'desc';
}

function selectViewer(viewerId) {
  selectedViewerId.value = viewerId;
}

function selectAsset(assetId) {
  selectedAssetId.value = assetId;
}

function openOutputsTab() {
  activeTab.value = 'outputs';
  if (!selectedVisualizeRunId.value && selectedRunId.value) {
    selectedVisualizeRunId.value = selectedRunId.value;
    return;
  }
  if (!selectedVisualizeRunId.value && runs.value.length > 0) {
    selectedVisualizeRunId.value = runs.value[0].id;
  }
}

function openSettingsModal() {
  settingsModal?.show();
}

function closeSettingsModal() {
  settingsModal?.hide();
}

function setRunSort(field) {
  if (runSortBy.value === field) {
    runSortDir.value = runSortDir.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  runSortBy.value = field;
  runSortDir.value = field === 'name' ? 'asc' : 'desc';
}

function sortIconClass(field) {
  if (runSortBy.value !== field) return '';
  return runSortDir.value === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
}

function compareRuns(a, b, field, dir) {
  const factor = dir === 'asc' ? 1 : -1;

  if (field === 'name') {
    const av = String(a?.name || '').toLowerCase();
    const bv = String(b?.name || '').toLowerCase();
    return av.localeCompare(bv) * factor;
  }

  if (field === 'createdAt') {
    const at = new Date(a?.createdAt || 0).getTime();
    const bt = new Date(b?.createdAt || 0).getTime();
    return (at - bt) * factor;
  }

  return 0;
}

function toggleStudy(studyId) {
  const current = new Set(selectedStudyIds.value);
  if (current.has(studyId)) current.delete(studyId);
  else current.add(studyId);
  selectedStudyIds.value = Array.from(current);
  persistSelectedStudies();
}

const filteredStudies = computed(() => {
  const q = studySearch.value.trim().toLowerCase();
  if (!q) return studies.value;
  return studies.value.filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.id || '').toLowerCase().includes(q));
});

function statusBadgeClass(status) {
  switch (status) {
    case 'running':
      return 'text-bg-primary';
    case 'queued':
      return 'text-bg-secondary';
    case 'failed':
      return 'text-bg-danger';
    case 'done':
      return 'text-bg-success';
    default:
      return 'text-bg-secondary';
  }
}

function formatDateTime(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
}

async function refreshProject() {
  await loadStudies();
  await loadProjectDatasets();
}

async function loadProjectDatasets() {
  datasetsLoading.value = true;
  datasetsLoadError.value = '';
  try {
    const res = await api.get('datasets', authHeaders());
    projectDatasets.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    projectDatasets.value = [];
    datasetsLoadError.value =
      error.response?.data?.error || error.message || 'Failed to load datasets.';
  } finally {
    datasetsLoading.value = false;
  }
}

async function loadStudies() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await api.get('datasets/studies', authHeaders());
    studies.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    studies.value = [];
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load project studies.';
  } finally {
    loading.value = false;
  }
}

function openStartAnalysis() {
  if (selectedStudies.value.length === 0) {
    activeTab.value = 'workbench';
    return;
  }
  if (!canRunJobs.value) return;
  if (!startModal) return;
  newRun.value = {
    tool: workspaceSettings.value.defaultTool || 'JupyterLab',
    name: '',
    notebookAssetId: selectedAssetId.value || '',
    externalJupyterUrl: String(workspaceSettings.value.defaultExternalJupyterUrl || '').trim(),
    computeTarget: workspaceSettings.value.defaultComputeTarget || 'local'
  };
  startModal.show();
}

function closeStartAnalysis() {
  startModal?.hide();
}

function createRun() {
  if (selectedStudies.value.length === 0) {
    activeTab.value = 'workbench';
    closeStartAnalysis();
    return;
  }
  if (!canRunJobs.value) {
    closeStartAnalysis();
    return;
  }

  const customName = (newRun.value.name || '').trim();
  const prefix = (workspaceSettings.value.runNamePrefix || '').trim();
  const fallbackName = `${newRun.value.tool} run`;
  const baseName = customName || fallbackName;
  const name = prefix ? `${prefix}${baseName}` : baseName;
  const asset = newRun.value.notebookAssetId
    ? projectAssets.value.find(a => a.id === newRun.value.notebookAssetId)
    : null;
  const extUrl = (newRun.value.externalJupyterUrl || '').trim();

  const launchPayload = {
    projectId: id.value,
    name,
    tool: newRun.value.tool,
    studyIds: selectedStudies.value.map(s => s.id)
  };
  if (asset) {
    launchPayload.notebookAssetId = asset.id;
    launchPayload.notebookUri = asset.uri;
    launchPayload.notebookKind = asset.kind;
    launchPayload.notebookName = asset.name;
  }
  if (extUrl) launchPayload.externalJupyterUrl = extUrl;
  const ds = selectedDatasetIds.value.map(String).filter(Boolean);
  if (ds.length) launchPayload.datasetIds = ds;
  const ct = newRun.value.computeTarget || 'local';
  launchPayload.computeTarget = ct;

  closeStartAnalysis();
  activeTab.value = workspaceSettings.value.autoOpenMonitorOnStart ? 'jobs' : activeTab.value;
  launchRun(launchPayload);
}

async function launchRun(payload) {
  // Try backend first if endpoint exists.
  try {
    const res = await api.post(`projects/${encodeURIComponent(payload.projectId)}/runs`, payload, authHeaders());
    const run = normalizeRunFromApi(res.data, payload);
    runs.value = [run, ...runs.value];
    selectedRunId.value = run.id;
    selectedVisualizeRunId.value = run.id;
    persistRuns();
    return;
  } catch (error) {
    // Fallback to local simulation while backend endpoint is not implemented.
    console.info('Run launch API unavailable, using local simulation:', error?.response?.status || error.message);
  }

  const run = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    projectId: payload.projectId,
    name: payload.name,
    tool: payload.tool,
    studyIds: payload.studyIds,
    status: 'queued',
    createdAt: new Date().toISOString(),
    source: 'local',
    ...(payload.notebookAssetId
      ? {
          notebookAssetId: payload.notebookAssetId,
          notebookUri: payload.notebookUri,
          notebookKind: payload.notebookKind,
          notebookName: payload.notebookName
        }
      : {}),
    ...(payload.externalJupyterUrl ? { externalJupyterUrl: payload.externalJupyterUrl } : {}),
    ...(Array.isArray(payload.datasetIds) && payload.datasetIds.length ? { datasetIds: payload.datasetIds } : {}),
    ...(payload.computeTarget ? { computeTarget: payload.computeTarget } : { computeTarget: 'local' })
  };
  runs.value = [run, ...runs.value];
  selectedRunId.value = run.id;
  selectedVisualizeRunId.value = run.id;
  persistRuns();

  // UI-only: simulate transitioning to "running" then "done"
  window.setTimeout(() => {
    const idx = runs.value.findIndex(r => r.id === run.id);
    if (idx === -1) return;
    runs.value[idx] = { ...runs.value[idx], status: 'running' };
    persistRuns();
  }, 500);

  window.setTimeout(() => {
    const idx = runs.value.findIndex(r => r.id === run.id);
    if (idx === -1) return;
    runs.value[idx] = { ...runs.value[idx], status: 'done' };
    persistRuns();
  }, 1800);
}

function normalizeRunFromApi(apiRun, payload) {
  const idValue = String(apiRun?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const nb = {
    notebookAssetId: apiRun?.notebookAssetId ?? payload?.notebookAssetId,
    notebookUri: apiRun?.notebookUri ?? payload?.notebookUri,
    notebookKind: apiRun?.notebookKind ?? payload?.notebookKind,
    notebookName: apiRun?.notebookName ?? payload?.notebookName,
    externalJupyterUrl: apiRun?.externalJupyterUrl ?? payload?.externalJupyterUrl,
    datasetIds: apiRun?.datasetIds ?? payload?.datasetIds,
    computeTarget: apiRun?.computeTarget ?? payload?.computeTarget
  };
  const base = {
    id: idValue,
    projectId: apiRun?.projectId || payload.projectId,
    name: apiRun?.name || payload.name,
    tool: apiRun?.tool || payload.tool,
    studyIds: Array.isArray(apiRun?.studyIds) ? apiRun.studyIds : payload.studyIds,
    status: apiRun?.status || 'queued',
    createdAt: apiRun?.createdAt || new Date().toISOString(),
    source: 'api'
  };
  const extras = {};
  if (nb.notebookAssetId) extras.notebookAssetId = nb.notebookAssetId;
  if (nb.notebookUri) extras.notebookUri = nb.notebookUri;
  if (nb.notebookKind) extras.notebookKind = nb.notebookKind;
  if (nb.notebookName) extras.notebookName = nb.notebookName;
  if (nb.externalJupyterUrl) extras.externalJupyterUrl = nb.externalJupyterUrl;
  if (Array.isArray(nb.datasetIds) && nb.datasetIds.length) extras.datasetIds = nb.datasetIds.map(String);
  const ctv = nb.computeTarget || 'local';
  extras.computeTarget = ctv;
  return { ...base, ...extras };
}

function clearRuns() {
  runs.value = [];
  selectedRunId.value = '';
  selectedVisualizeRunId.value = '';
  persistRuns();
}

function openEditRun(run) {
  editRunTargetId.value = run?.id || '';
  editRunForm.value = {
    name: run?.name || '',
    tool: run?.tool || 'JupyterLab',
    computeTarget: run?.computeTarget || 'local'
  };
  editRunModal?.show();
}

function closeEditRun() {
  editRunModal?.hide();
}

async function saveRunEdits() {
  const runId = editRunTargetId.value;
  if (!runId) return;
  const nextName = (editRunForm.value.name || '').trim();
  const nextTool = editRunForm.value.tool || 'JupyterLab';
  const nextCompute = editRunForm.value.computeTarget || 'local';

  if (!nextName) return;

  // Try backend patch first if endpoint exists.
  try {
    await api.patch(
      `projects/${encodeURIComponent(id.value)}/runs/${encodeURIComponent(runId)}`,
      { name: nextName, tool: nextTool, computeTarget: nextCompute },
      authHeaders()
    );
  } catch (error) {
    console.info('Run edit API unavailable, applying local edit:', error?.response?.status || error.message);
  }

  const idx = runs.value.findIndex(r => r.id === runId);
  if (idx !== -1) {
    runs.value[idx] = {
      ...runs.value[idx],
      name: nextName,
      tool: nextTool,
      computeTarget: nextCompute
    };
    persistRuns();
  }

  closeEditRun();
}

function openDeleteRun(run) {
  deleteRunTargetId.value = run?.id || '';
  deleteRunModal?.show();
}

function closeDeleteRun() {
  deleteRunModal?.hide();
}

async function confirmDeleteRun() {
  const run = deleteRunTarget.value;
  if (!run) return;

  // Try backend delete first if endpoint exists.
  try {
    await api.delete(
      `projects/${encodeURIComponent(id.value)}/runs/${encodeURIComponent(run.id)}`,
      authHeaders()
    );
  } catch (error) {
    console.info('Run delete API unavailable, applying local delete:', error?.response?.status || error.message);
  }

  runs.value = runs.value.filter(r => r.id !== run.id);
  if (selectedRunId.value === run.id) {
    selectedRunId.value = runs.value[0]?.id || '';
  }
  if (selectedVisualizeRunId.value === run.id) {
    selectedVisualizeRunId.value = runs.value[0]?.id || '';
  }
  persistRuns();
  closeDeleteRun();
}

async function duplicateRun(run) {
  if (!run) return;

  // Try backend duplicate first if endpoint exists.
  try {
    const res = await api.post(
      `projects/${encodeURIComponent(id.value)}/runs/${encodeURIComponent(run.id)}/duplicate`,
      {},
      authHeaders()
    );
    const duplicated = normalizeRunFromApi(res.data, {
      projectId: run.projectId || id.value,
      name: `${run.name} (copy)`,
      tool: run.tool,
      studyIds: Array.isArray(run.studyIds) ? run.studyIds : [],
      notebookAssetId: run.notebookAssetId,
      notebookUri: run.notebookUri,
      notebookKind: run.notebookKind,
      notebookName: run.notebookName,
      externalJupyterUrl: run.externalJupyterUrl,
      datasetIds: Array.isArray(run.datasetIds) ? run.datasetIds : undefined,
      computeTarget: run.computeTarget || 'local'
    });
    runs.value = [duplicated, ...runs.value];
    selectedRunId.value = duplicated.id;
    selectedVisualizeRunId.value = duplicated.id;
    persistRuns();
    return;
  } catch (error) {
    console.info('Run duplicate API unavailable, applying local duplicate:', error?.response?.status || error.message);
  }

  const duplicated = {
    ...run,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `${run.name} (copy)`,
    status: 'queued',
    createdAt: new Date().toISOString(),
    source: 'local'
  };
  runs.value = [duplicated, ...runs.value];
  selectedRunId.value = duplicated.id;
  selectedVisualizeRunId.value = duplicated.id;
  persistRuns();
}

function saveLocalProjectName() {
  localStorage.setItem(storageKey('name'), localProjectName.value || '');
}

function resetLocalProjectName() {
  localProjectName.value = '';
  localStorage.removeItem(storageKey('name'));
}

function saveSettings() {
  saveLocalProjectName();
  localStorage.setItem(storageKey('settings'), JSON.stringify(workspaceSettings.value));
  closeSettingsModal();
}

function resetSettings() {
  resetLocalProjectName();
  workspaceSettings.value = {
    defaultTool: 'JupyterLab',
    runNamePrefix: '',
    defaultExternalJupyterUrl: '',
    defaultComputeTarget: 'local',
    apiKeyScope: 'project',
    autoOpenMonitorOnStart: true
  };
  localStorage.removeItem(storageKey('settings'));
}

onMounted(async () => {
  document.title = `${APP_NAME} Project`;

  if (!id.value) {
    router.replace({ name: 'studies' });
    return;
  }

  loadLocalState();
  await loadStudies();
  await loadProjectDatasets();

  if (settingsModalEl.value) {
    settingsModal = new Modal(settingsModalEl.value);
  }
  if (startModalEl.value) {
    startModal = new Modal(startModalEl.value);
  }
  if (editRunModalEl.value) {
    editRunModal = new Modal(editRunModalEl.value);
  }
  if (deleteRunModalEl.value) {
    deleteRunModal = new Modal(deleteRunModalEl.value);
  }
  if (runActionsToggleEl.value) {
    new Dropdown(runActionsToggleEl.value);
  }
});

watch(id, async (newId, oldId) => {
  if (!newId) return;
  if (oldId === undefined) return;
  if (newId === oldId) return;
  wranglerRaw.value = '';
  wranglerPreview.value = null;
  wranglerSectionOpen.value = false;
  loadLocalState();
  await loadStudies();
  await loadProjectDatasets();
});

// Keep Jobs and Outputs run selection in sync.
watch(
  () => selectedRunId.value,
  (next) => {
    if (selectedVisualizeRunId.value !== next) {
      selectedVisualizeRunId.value = next || '';
    }
  }
);

watch(
  () => selectedVisualizeRunId.value,
  (next) => {
    if (selectedRunId.value !== next) {
      selectedRunId.value = next || '';
    }
  }
);
</script>

<style scoped>
.project-list {
  max-height: 520px;
  overflow: auto;
}

.table-sort-btn {
  text-decoration: none;
  color: inherit;
  font-weight: 600;
}

.table-sort-btn:hover {
  text-decoration: none;
}

.dataset-table-wrap {
  max-height: 280px;
  overflow: auto;
}

.payload-preview {
  max-height: 240px;
  overflow: auto;
  font-size: 0.75rem;
}

.wrangler-preview {
  max-height: 240px;
  overflow: auto;
}
</style>

