import { defineConfig } from 'astro/config';

// Replace with the final production domain before publishing (used for canonical and hreflang URLs).
export default defineConfig({
  site: 'https://www.example-klinika.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // The project lives in a OneDrive folder, where file-change events are unreliable on Windows;
  // polling makes the dev server pick up every edit.
  vite: { server: { watch: { usePolling: true, interval: 300 } } },
});
