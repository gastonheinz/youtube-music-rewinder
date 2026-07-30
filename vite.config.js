import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // El bind mount del devcontainer sobre WSL2 no propaga eventos inotify: sin
    // polling, Vite no se entera de ningun cambio y sigue sirviendo la version
    // vieja del archivo hasta que se reinicia el server.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  worker: {
    format: 'es',
  },
});
