<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/teams">Teams</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          {{ team?.name || 'Team' }}
        </li>
      </ol>
    </nav>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading team...</p>
    </div>

    <div v-else-if="!team" class="alert alert-danger">Team not found.</div>

    <div v-else class="row gy-3">
      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Details</h5>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Slug</label>
            <input :value="team.slug" class="form-control" disabled />
          </div>

          <div v-if="isSuperAdmin(user.role)" class="mb-3">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-select">
              <option value="active">active</option>
              <option value="deactivated">deactivated</option>
            </select>
          </div>
          <div v-else class="mb-3">
            <label class="form-label">Status</label>
            <input :value="team.status" class="form-control" disabled />
          </div>

          <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
            {{ message }}
          </div>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="saving || !form.name" @click="onSave">
              Save
            </button>
          </div>
        </div>
      </div>

      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <div class="d-flex align-items-center mb-3">
            <h5 class="card-title mb-0">Members</h5>
            <button
              class="btn btn-sm btn-outline-primary ms-auto"
              @click="$router.push({ name: 'usersAdd', query: { team_id: team.id, role: 'team_admin' } })"
            >
              Invite Team admin
            </button>
          </div>

          <div v-if="!team.members?.length" class="text-muted">
            No members yet. Invite a Team admin or Project user from Users.
          </div>
          <ul v-else class="list-group list-group-flush">
            <li
              v-for="m in team.members"
              :key="m.id"
              class="list-group-item px-0 d-flex justify-content-between"
            >
              <div>
                <div class="fw-semibold">{{ m.name || m.email }}</div>
                <div class="small text-muted">{{ m.email }}</div>
              </div>
              <span class="badge text-bg-secondary align-self-center">{{ roleLabel(m.role) }}</span>
            </li>
          </ul>

          <button
            class="btn btn-sm btn-link mt-2 px-0"
            @click="$router.push({ name: 'usersAdd', query: { team_id: team.id, role: 'project_user' } })"
          >
            Invite Project user
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin, roleLabel } from '@/utils/roles';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const team = ref(null);
const loading = ref(true);
const saving = ref(false);
const message = ref('');
const ok = ref(false);
const form = reactive({ name: '', status: 'active' });

onMounted(async () => {
  document.title = `${APP_NAME} Edit Team`;
  try {
    const res = await api.get(`teams/${route.params.id}`, authHeaders());
    team.value = res.data;
    form.name = res.data.name;
    form.status = res.data.status;
  } catch (e) {
    console.error(e);
    team.value = null;
  } finally {
    loading.value = false;
  }
});

async function onSave() {
  saving.value = true;
  message.value = '';
  ok.value = false;
  try {
    const payload = { name: form.name };
    if (isSuperAdmin(user.value.role)) {
      payload.status = form.status;
    }
    const res = await api.patch(`teams/${route.params.id}`, payload, authHeaders());
    team.value = { ...team.value, ...res.data };
    ok.value = true;
    message.value = 'Team updated.';
  } catch (error) {
    message.value = error.response?.data?.error || `Failed to update team: ${error}`;
  } finally {
    saving.value = false;
  }
}
</script>
