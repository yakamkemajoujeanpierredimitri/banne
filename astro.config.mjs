// @ts-check
import { defineConfig } from 'astro/config';

import solidJs from '@astrojs/solid-js';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [solidJs()],

  adapter: vercel(),
  
  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'en', 'fr', 'nl'],
    routing: {
        prefixDefaultLocale: false
    }
  }
});