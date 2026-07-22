import { createApp } from 'vue'
import App from './App.vue'
// import Vueform from '@vueform/vueform'
// import vueformConfig from './../vueform.config'

import '@vueform/multiselect/themes/default.css'

import router from "./router/index"

import { createPinia } from 'pinia'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Brand tokens + Bootstrap primary overrides (must load after Bootstrap)
import './style.css'

import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'

import hljs from 'highlight.js/lib/core';
import hljsVuePlugin from "@highlightjs/vue-plugin";

import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);

const pinia = createPinia()

// ------------------ MONACO EDITOR WORKER SETUP ------------------
// Import the workers from the `monaco-editor` package.
// The `?worker` query suffix is a Vite-specific feature that tells
// Vite to bundle the script as a web worker.
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Configure the `MonacoEnvironment` global object.
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    // The default worker for everything else
    return new editorWorker()
  },
}

createApp(App)
  .use(router)
  .use(pinia)
  .use(hljsVuePlugin)
  // .use(Vueform, vueformConfig)
  .use(FloatingVue, {
    themes: {
      'my-theme': {
        $extend: 'tooltip',
        $resetCss: true,
      },
    },
  })
  .mount('#app');
