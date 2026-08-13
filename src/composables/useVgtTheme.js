import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUIStore } from '@/stores/ui';

/** VueGoodTable theme string synced to the app dark-mode store (not OS prefers-color-scheme). */
export function useVgtTheme() {
  const { darkMode } = storeToRefs(useUIStore());
  const tableTheme = computed(() => (darkMode.value ? 'nocturnal bg-dark' : ''));
  return { tableTheme, darkMode };
}
