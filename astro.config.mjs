// @ts-check
import { defineConfig } from 'astro/config';

import solidJs from '@astrojs/solid-js';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [solidJs()],

  adapter: node({
    mode: 'standalone'
  }),
  
  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'en', 'fr', 'nl'],
    routing: {
        prefixDefaultLocale: false
    }
  }
});